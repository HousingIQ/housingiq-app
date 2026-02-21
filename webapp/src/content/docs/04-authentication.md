# Authentication

## Overview

HousingIQ uses NextAuth.js v5 (Auth.js) for user authentication, supporting both Google OAuth and email/password authentication. The authentication flow is designed to be simple - no teams, no roles, just single-user access control.

## Authentication Methods

### 1. Google OAuth
Users can sign in with their Google account for quick, passwordless authentication.

### 2. Email/Password
Users can create an account with their email and password, or sign in with existing credentials. Passwords are hashed with bcrypt (12 rounds).

## Test User Credentials

For development and testing purposes, a test user can be seeded into the database:

| Field | Value |
|-------|-------|
| Email | `test@housingiq.com` |
| Password | `TestPassword123!` |
| Name | Test User |

To create/update the test user, run:
```bash
cd webapp
npm run db:seed-test-user
```

**Note:** Never use these credentials in production. This test user is for development purposes only.

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant NA as NextAuth
    participant G as Google
    participant DB as Database

    U->>A: Click "Sign in with Google"
    A->>NA: signIn('google')
    NA->>G: Redirect to Google OAuth
    G->>U: Show consent screen
    U->>G: Approve access
    G->>NA: Return authorization code
    NA->>G: Exchange code for tokens
    G->>NA: Return access_token, id_token
    NA->>DB: Create/update user record
    NA->>NA: Create session JWT
    NA->>A: Set HTTP-only cookie
    A->>U: Redirect to /dashboard

    Note over U,A: Subsequent requests
    U->>A: Request /dashboard
    A->>NA: Verify session cookie
    NA->>A: Return session data
    A->>U: Render protected page
```

## Email/Password Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant API as API Route
    participant DB as Database
    participant NA as NextAuth

    Note over U,NA: Sign Up Flow
    U->>A: Fill signup form
    A->>API: POST /api/auth/signup
    API->>API: Validate input
    API->>API: Hash password (bcrypt)
    API->>DB: Insert new user
    DB->>API: Return user
    API->>A: Success response
    A->>NA: signIn('credentials')
    NA->>A: Set session cookie
    A->>U: Redirect to /dashboard

    Note over U,NA: Sign In Flow
    U->>A: Fill login form
    A->>NA: signIn('credentials')
    NA->>DB: Query user by email
    NA->>NA: Compare password hash
    NA->>A: Set session cookie
    A->>U: Redirect to /dashboard
```

## Session Management

```mermaid
stateDiagram-v2
    [*] --> Anonymous: Visit site
    Anonymous --> Authenticating: Click Sign In
    Authenticating --> Authenticated: OAuth/Credentials success
    Authenticating --> Anonymous: Auth failure
    Authenticated --> Anonymous: Sign out
    Authenticated --> Authenticated: Session refresh

    note right of Authenticated
        Session stored in HTTP-only cookie
        JWT with user info
        Auto-refreshes on requests
    end note
```

## Configuration Files

### NextAuth Configuration

**File:** `src/lib/auth/config.ts`

```typescript
import { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials against database
        // Returns user object or null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Persist Google users to database
      // Return true to allow sign in
    },
    authorized({ auth, request: { nextUrl } }) {
      // Protect dashboard routes
    },
    jwt({ token, user, account }) {
      // Add user ID to JWT token
    },
    session({ session, token }) {
      // Add user ID to session
    },
  },
};
```

### Auth Exports

**File:** `src/lib/auth/index.ts`

```typescript
import NextAuth from 'next-auth';
import { authConfig } from './config';

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

### API Route Handler

**File:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

### Signup API Route

**File:** `src/app/api/auth/signup/route.ts`

```typescript
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  // Validate email and password
  // Check if user exists
  // Hash password with bcrypt
  // Insert new user
  // Return success or error
}
```

### Middleware

**File:** `src/middleware.ts`

```typescript
import { auth } from '@/lib/auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## User Schema

**File:** `src/lib/db/schema.ts`

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  passwordHash: varchar('password_hash', { length: 255 }),
  googleId: varchar('google_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

## Route Protection

```mermaid
flowchart TD
    REQ[Incoming Request] --> MW{Middleware}

    MW --> PATH{Path?}

    PATH -->|/api/*| API[API Routes - Pass through]
    PATH -->|/_next/*| STATIC[Static files - Pass through]
    PATH -->|/dashboard/*| DASH{Authenticated?}
    PATH -->|Other| PUBLIC[Public - Pass through]

    DASH -->|Yes| ALLOW[Allow request]
    DASH -->|No| REDIRECT[Redirect to /login]
```

| Route | Protection | Description |
|-------|------------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Login page |
| `/signup` | Public | Signup page |
| `/dashboard` | Protected | Main dashboard |
| `/dashboard/*` | Protected | All dashboard routes |
| `/api/auth/*` | Public | NextAuth endpoints |
| `/api/auth/signup` | Public | User registration |
| `/api/chat` | Protected | AI chat (auth required) |
| `/api/chat/usage` | Protected | Rate limit status (auth required) |
| `/api/market/*` | Public | Market data API |
| `/api/regions/*` | Public | Region search API |

## Environment Variables

```bash
# .env.local

# NextAuth.js
AUTH_SECRET=your-secret-key-here
AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret

# Database
DATABASE_URL=postgresql://user:pass@host/database
```

## Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Configure:
   - **Name:** HousingIQ
   - **Authorized JavaScript origins:** `http://localhost:3000`
   - **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env.local`

```mermaid
flowchart LR
    A[Google Cloud Console] --> B[Create Project]
    B --> C[Enable OAuth]
    C --> D[Create Credentials]
    D --> E[Configure URIs]
    E --> F[Copy to .env.local]
```

## Using Authentication in Components

### Server Components

```typescript
// Get session in server component
import { auth } from '@/lib/auth';

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <p>Not authenticated</p>;
  }

  return <p>Welcome, {session.user?.name}</p>;
}
```

### Client Components

```typescript
'use client';

import { signIn, signOut } from 'next-auth/react';

export function LoginButton() {
  return (
    <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
      Sign in with Google
    </button>
  );
}

export function CredentialsLoginButton() {
  const handleLogin = async () => {
    await signIn('credentials', {
      email: 'user@example.com',
      password: 'password123',
      callbackUrl: '/dashboard',
    });
  };

  return <button onClick={handleLogin}>Sign in</button>;
}

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/' })}>
      Sign out
    </button>
  );
}
```

### Server Actions

```typescript
// In dashboard layout
import { signOut } from '@/lib/auth';

<form action={async () => {
  'use server';
  await signOut({ redirectTo: '/' });
}}>
  <button type="submit">Sign Out</button>
</form>
```

## Session Data Structure

```typescript
interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
  };
  expires: string;  // ISO date string
}
```

## Security Features

| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcrypt with 12 rounds |
| Session Storage | HTTP-only cookies (not accessible via JS) |
| Token Signing | HMAC-SHA256 with AUTH_SECRET |
| CSRF Protection | Built-in NextAuth CSRF tokens |
| Secure Cookies | `Secure` flag in production |
| SameSite | `Lax` policy |
| Password Requirements | Minimum 8 characters |

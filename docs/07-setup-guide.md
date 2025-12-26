# Setup Guide

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Google Cloud account (for OAuth)
- Git

## Quick Start

```mermaid
flowchart LR
    A[Clone Repo] --> B[Start Postgres]
    B --> C[Configure Env]
    C --> D[Push Schema]
    D --> E[Run Dev Server]
    E --> F[Open Browser]
```

## Step-by-Step Setup

### 1. Navigate to Project

```bash
cd housingiq-app/webapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL on port **5432**.

Verify it's running:
```bash
docker compose ps
# Should show: housingiq-postgres running
```

### 4. Configure Environment Variables

The `.env.local` file should already exist. Verify it has:

```bash
# Database - Local Docker Postgres
DATABASE_URL=postgresql://housingiq:housingiq_dev@localhost:5432/housingiq

# NextAuth.js
NEXTAUTH_SECRET=dev-secret-change-in-production-abc123xyz
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 5. Set Up Google OAuth

```mermaid
flowchart TD
    A[Google Cloud Console] --> B[Create/Select Project]
    B --> C[APIs & Services]
    C --> D[Credentials]
    D --> E[Create OAuth Client ID]
    E --> F[Configure URIs]
    F --> G[Copy to .env.local]
```

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "HousingIQ"
3. Navigate to **APIs & Services > OAuth consent screen**
   - User Type: External
   - App name: HousingIQ
   - Support email: your email
   - Save and continue through scopes
4. Navigate to **Credentials > Create Credentials > OAuth client ID**
   - Application type: Web application
   - Name: HousingIQ Local
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env.local`

### 6. Push Database Schema

```bash
npm run db:push
```

Expected output:
```
[✓] Changes applied
```

### 7. Start Development Server

```bash
npm run dev
```

### 8. Open Application

Visit http://localhost:3000

```mermaid
flowchart LR
    subgraph Pages
        LP[Landing Page<br/>localhost:3000]
        LG[Login<br/>localhost:3000/login]
        DB[Dashboard<br/>localhost:3000/dashboard]
    end

    LP --> LG --> DB
```

## Verification Checklist

- [ ] Docker container running (`docker compose ps`)
- [ ] Database accessible (`npm run db:studio`)
- [ ] Environment variables set (`.env.local`)
- [ ] Google OAuth configured
- [ ] Dev server running (`npm run dev`)
- [ ] Landing page loads
- [ ] Google sign-in works
- [ ] Dashboard accessible after login

## Common Issues

### Port 5432 Already in Use

If you need to change the port:

1. Edit `docker-compose.yml`:
   ```yaml
   ports:
     - "5432:5432"  # Change 5432 to another port
   ```

2. Update `DATABASE_URL` in `.env.local`:
   ```
   DATABASE_URL=postgresql://housingiq:housingiq_dev@localhost:5432/housingiq
   ```

### Database Connection Error

```bash
# Check if container is running
docker compose ps

# View logs
docker compose logs postgres

# Restart container
docker compose down && docker compose up -d
```

### Google OAuth Error

Verify:
1. Redirect URI matches exactly: `http://localhost:3000/api/auth/callback/google`
2. Client ID and Secret are copied correctly (no extra spaces)
3. OAuth consent screen is configured

### Hydration Errors

If you see "Hydration failed" errors, ensure:
1. No `Math.random()` in components (use seeded random)
2. No `Date.now()` or locale-dependent formatting
3. Restart dev server after fixes

## Database Management

### View Database (Drizzle Studio)

```bash
npm run db:studio
```

Opens web UI at https://local.drizzle.studio

### Generate Migrations

```bash
npm run db:generate
```

### Apply Migrations

```bash
npm run db:migrate
```

### Reset Database

```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Fresh start
npm run db:push         # Push schema
```

## Development Workflow

```mermaid
flowchart TD
    subgraph Setup["Initial Setup (once)"]
        S1[docker compose up -d]
        S2[npm install]
        S3[Configure .env.local]
        S4[npm run db:push]
    end

    subgraph Daily["Daily Development"]
        D1[docker compose up -d]
        D2[npm run dev]
        D3[Edit code]
        D4[View in browser]
        D5[Commit changes]
    end

    S1 --> S2 --> S3 --> S4
    S4 --> D1
    D1 --> D2 --> D3 --> D4 --> D3
    D4 --> D5
```

## Next Steps

After basic setup:

1. **Load Real Data**: See [Data Pipeline Documentation](./06-data-pipeline.md)
2. **Customize UI**: Edit components in `src/components/ui/`
3. **Add Features**: Extend dashboard in `src/app/dashboard/`
4. **Deploy**: Configure Neon Postgres and Vercel/other hosting

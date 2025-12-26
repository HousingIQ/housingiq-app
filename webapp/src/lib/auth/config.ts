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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth - persist user to database
      if (account?.provider === 'google' && user.email) {
        try {
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, user.email),
          });

          if (existingUser) {
            // Update existing user with Google data
            await db
              .update(users)
              .set({
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
                googleId: account.providerAccountId,
                updatedAt: new Date(),
              })
              .where(eq(users.email, user.email));
          } else {
            // Create new user
            await db.insert(users).values({
              email: user.email,
              name: user.name,
              image: user.image,
              googleId: account.providerAccountId,
            });
          }
        } catch (error) {
          console.error('Error persisting Google user:', error);
          return false;
        }
      }

      return true;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login page
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For credentials provider, user.id is already set
        // For Google, we need to fetch from DB to get the DB id
        if (account?.provider === 'google' && user.email) {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user.email),
          });
          if (dbUser) {
            token.id = dbUser.id.toString();
          }
        } else {
          token.id = user.id;
        }
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

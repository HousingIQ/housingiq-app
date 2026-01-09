This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

 Deployment Steps

  1. Set up Neon PostgreSQL (if not done)

  - Go to https://neon.tech and create a project
  - Copy the connection string for your DATABASE_URL

  2. Set up Google OAuth

  - Go to https://console.cloud.google.com/apis/credentials
  - Create OAuth 2.0 credentials
  - Add authorized redirect URI: https://your-app.vercel.app/api/auth/callback/google

  3. Deploy to Vercel

  cd /home/hminle/gitrepos/housingiq/housingiq-app/webapp

  # Install Vercel CLI (if not installed)
  npm i -g vercel

  # Deploy
  vercel

  4. Configure Environment Variables in Vercel

  Set these in Vercel Dashboard → Settings → Environment Variables:

  | Variable             | Value                                        |
  |----------------------|----------------------------------------------|
  | DATABASE_URL         | postgresql://...?sslmode=require (from Neon) |
  | AUTH_SECRET          | Generate with openssl rand -base64 32        |
  | AUTH_URL             | https://your-app.vercel.app                  |
  | GOOGLE_CLIENT_ID     | Your Google OAuth client ID                  |
  | GOOGLE_CLIENT_SECRET | Your Google OAuth client secret              |

  5. Run Database Migrations (if needed)

  After setting env vars, run migrations locally pointing to Neon:
  NEON_DATABASE_URL="your-neon-url" npm run db:push

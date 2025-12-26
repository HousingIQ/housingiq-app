# HousingIQ Frontend

Next.js frontend for the HousingIQ analytics platform, deployed on Vercel.

## Local Development

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

Create a `.env.local` file:

```env
# Backend API URL (required for API calls)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Feature flags
NEXT_PUBLIC_ENABLE_AI_CHAT=false
```

For production, set `NEXT_PUBLIC_API_URL` to your deployed backend URL.

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── dashboard/    # Dashboard page
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   └── ui/           # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and config
│   └── providers/        # React context providers
├── public/               # Static assets
├── package.json
└── next.config.ts
```

## Deployment

This frontend is configured for [Vercel](https://vercel.com).

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your Git repository to Vercel for automatic deployments.

## Technology Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TailwindCSS 4** - Utility-first CSS
- **React Query** - Server state management
- **Recharts** - Charting library
- **Radix UI** - Accessible UI primitives

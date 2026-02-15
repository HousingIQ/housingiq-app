# ============================================================================
# HousingIQ Webapp - Multi-stage Docker Build
# ============================================================================
# Targets:
#   runner  - Production Next.js server (default)
#   init    - DB schema push + seed (one-shot)
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: deps - Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies based on the lockfile
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: builder - Build the Next.js application
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set dummy env vars so Next.js build succeeds without a real DB connection.
# Real values are injected at runtime via docker-compose environment.
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV AUTH_SECRET="build-time-placeholder-secret"

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: runner - Production server (default target)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Tell NextAuth to trust the proxy (Docker networking)
ENV AUTH_TRUST_HOST=true

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# Stage 4: init - Schema push + seed (one-shot container)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS init

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

CMD ["sh", "-c", "npx drizzle-kit push && npx tsx scripts/seed-test-user.ts"]

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HousingIQ is a full-stack housing analytics application combining a Next.js web app with a Python data platform (Dagster, Polars, Great Expectations). It ingests Zillow housing data and presents analytics through an interactive dashboard.

**Monorepo Structure:**
- `/webapp` - Next.js 15 application (TypeScript, Drizzle ORM, NextAuth.js)
- `/data-platform` - Python data engineering (Dagster, Polars, Great Expectations)
- Shared PostgreSQL database via Docker Compose

## Quick Start

```bash
# First-time setup (installs everything)
make setup

# Start development (runs all services)
make dev
```

This starts:
- PostgreSQL on port 5432
- pgweb on http://localhost:8081
- Next.js webapp on http://localhost:3000
- Dagster UI on http://localhost:3001

## Common Commands

### Root Level
```bash
make setup       # First-time setup (install deps, push schema)
make dev         # Start all services for development
make up          # Start PostgreSQL + pgweb containers
make down        # Stop containers
make psql        # Connect to PostgreSQL CLI
make webapp      # Start Next.js only
make dagster     # Start Dagster only
make db-push     # Push Drizzle schema to database
make db-seed     # Seed test user
make materialize # Materialize all Dagster assets
```

### Webapp (from /webapp)
```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint
npm run db:push          # Push Drizzle schema to database
npm run db:migrate       # Apply migrations
npm run db:studio        # Open Drizzle Studio
npm run db:seed-test-user # Seed test user
```

### Data Platform (from /data-platform)
```bash
make setup         # Install dependencies
make dagster       # Start Dagster webserver
make test          # Run pytest
make lint          # Run ruff linter
make lint-fix      # Auto-fix linting issues
make typecheck     # Run mypy
make gx            # Run Great Expectations checkpoint
```

### Running a Single Test
```bash
# Python (from /data-platform)
pytest tests/test_zillow_schemas.py -v
pytest tests/test_zillow_transformer.py::test_specific_function -v
```

## Architecture

### Data Flow
```
Zillow (external) → Python ingestion → Parquet files
                                           ↓
                                    Polars transformations
                                           ↓
                                    PostgreSQL app schema → Next.js API → React UI
```

### Database Schema Ownership
- **Drizzle ORM** manages: `app.*` schema (users, regions, zhvi_values, zori_values, market_summary)
- **Dagster/Polars** populates: `app.regions`, `app.zhvi_values`, `app.zori_values`, `app.market_summary`

Schema changes:
- Edit `webapp/src/lib/db/schema.ts` → run `npm run db:push`

### Dagster Asset Groups
1. **ingestion**: Download and transform Zillow CSV data to Parquet
2. **transforms**: Polars transformations (YoY/MoM calculations, market summary)
3. **app_database**: Load final tables to PostgreSQL for webapp

### Authentication
NextAuth.js v5 beta with Google OAuth and email/password. Configuration in `webapp/src/lib/auth/config.ts`. Protected routes defined in `webapp/src/middleware.ts`.

## Key Patterns

### Frontend (Next.js)
- App Router with Server Components by default
- Client Components marked with `"use client"`
- Tailwind CSS 4 + shadcn/ui components
- Recharts for data visualization

### Data Platform (Python)
- **Dagster**: Software-defined assets with automatic lineage
- **Polars**: High-performance DataFrame operations (10-20x faster than dbt for large datasets)
- **Great Expectations**: Data validation before loading

## Port Assignments
| Service | Port |
|---------|------|
| PostgreSQL | 5432 |
| pgweb | 8081 |
| Next.js | 3000 |
| Dagster UI | 3001 |

## Environment Setup

Required `.env.local` in webapp (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth.js secret
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth credentials

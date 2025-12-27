# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HousingIQ is a full-stack housing analytics application combining a Next.js 15 web app with a Python data platform (Dagster, dbt, Great Expectations). It ingests Zillow housing data and presents analytics through an interactive dashboard.

**Monorepo Structure:**
- `/webapp` - Next.js 15 application (TypeScript, Drizzle ORM, NextAuth.js)
- `/data-platform` - Python data engineering (Dagster, dbt, Polars, Great Expectations)
- Shared PostgreSQL database via Docker Compose

## Common Commands

### Root Level
```bash
make up           # Start PostgreSQL + pgweb containers
make down         # Stop containers
make psql         # Connect to PostgreSQL CLI
make webapp       # Start Next.js dev server
make dagster      # Start Dagster UI
make dbt          # Run dbt build
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
make setup         # Full setup (install + dbt deps)
make dagster       # Start Dagster webserver
make test          # Run pytest
make lint          # Run ruff linter
make lint-fix      # Auto-fix linting issues
make typecheck     # Run mypy
make dbt-run       # Run all dbt models
make dbt-test      # Run dbt tests
make gx            # Run Great Expectations checkpoint
```

### Running a Single Test
```bash
# Python (from /data-platform)
pytest tests/test_zillow_schemas.py -v
pytest tests/test_zillow_transformer.py::test_specific_function -v

# dbt (from /data-platform/dbt)
dbt test --select model_name
```

## Architecture

### Data Flow
```
Zillow (external) → Python ingestion → PostgreSQL raw schema
                                           ↓
                                    dbt transformations
                                           ↓
                                    analytics schema → Next.js API → React UI
```

### Database Schema Ownership
- **Drizzle ORM** manages: `app.users`, `app.regions`, `app.zhvi_values`
- **dbt** manages: `raw.*`, `staging.*`, `analytics.*` (dim_regions, fct_zhvi_values, etc.)

Schema changes:
- For `app.*` tables: Edit `webapp/src/lib/db/schema.ts` → run `npm run db:push`
- For analytics tables: Edit dbt models in `data-platform/dbt/models/` → run `dbt run`

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
- **dbt**: Staging → marts transformation layers with enforced contracts
- **Great Expectations**: Data validation before loading
- **Polars**: DataFrame operations (preferred over pandas for performance)

### dbt Layer Structure
- `staging/` - Views that clean and deduplicate raw data
- `intermediate/` - Ephemeral models for business logic
- `marts/` - Final fact and dimension tables in `analytics` schema

## Port Assignments
| Service | Port |
|---------|------|
| PostgreSQL | 5432 |
| pgweb | 8081 |
| Next.js | 3000 |
| Dagster UI | 3000 (run separately from Next.js) |
| dbt docs | 8080 |

## Environment Setup

Required `.env.local` in webapp (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth.js secret
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth credentials

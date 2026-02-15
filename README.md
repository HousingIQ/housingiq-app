# HousingIQ

Housing analytics web application powered by Zillow data, featuring a modern data platform with Dagster and Polars.

## Quick Start (Docker)

Only Docker is required. Clone the repo and run three commands:

```bash
# 1. Build all images
make docker-build

# 2. Start all services
make docker-up

# 3. Initialize database (push schema + seed test user)
make docker-init
```

Services available after startup:

| Service | URL |
|---------|-----|
| Webapp | http://localhost:3000 |
| Dagster UI | http://localhost:3001 |
| pgweb (DB viewer) | http://localhost:8081 |
| PostgreSQL | localhost:5432 |

Login with `test@housingiq.com` / `TestPassword123!`

### Load Housing Data

Open the Dagster UI at http://localhost:3001 and materialize assets in order:

1. **ingestion** group - downloads Zillow CSV data
2. **transforms** group - creates Parquet files with Polars
3. **app_database** group - loads final tables into PostgreSQL

## Quick Start (Local Dev)

For active development with hot-reload, run the webapp and Dagster locally while using Docker only for PostgreSQL:

```bash
# First-time setup (installs deps, starts DB, pushes schema, seeds user)
make setup

# Start all services for development
make dev
```

Prerequisites: Python 3.11+, Node.js 20+, npm.

**Local mode vs Docker mode:**

| | Local Dev (`make dev`) | Docker (`make docker-up`) |
|---|---|---|
| PostgreSQL | Docker container | Docker container |
| Webapp | Local process (hot-reload) | Docker container |
| Dagster | Local process (hot-reload) | Docker container |
| Data files | `data-platform/data/` on host | `dagster-data` Docker volume |
| Best for | Active development | Demo, CI, deployment |

Do not run both modes at the same time -- they share ports 3000 and 3001.

## Project Structure

```
housingiq-app/
├── data-platform/                # Data engineering stack
│   ├── housingiq_dagster/       # Dagster assets & orchestration
│   ├── ingestion/               # Data source connectors (Zillow)
│   ├── great_expectations/      # Data quality validation
│   ├── Dockerfile               # Python/Dagster container image
│   └── tests/                   # Python tests
│
├── webapp/                       # Next.js full-stack web application
│   ├── src/
│   │   ├── app/                 # App Router pages & API routes
│   │   ├── components/          # UI components
│   │   └── lib/                 # Utilities, DB, Auth
│   └── Dockerfile               # Multi-stage Next.js container image
│
├── init-db/                      # PostgreSQL init scripts (schemas)
├── docker-compose.yml           # Full-stack service definitions
├── Makefile                     # Project orchestration commands
└── CLAUDE.md                    # AI assistant guidance
```

## Available Commands

### Docker (full stack)

```bash
make docker-build     # Build all Docker images
make docker-up        # Start all services
make docker-init      # Initialize DB schema + seed test user (first time)
make docker-down      # Stop all services
make docker-logs      # Follow logs from all services
make docker-restart   # Rebuild and restart all services
make docker-clean     # Stop services and remove all volumes (fresh start)
```

### Local Development

```bash
make setup            # First-time setup (install deps, push schema, seed)
make dev              # Start all services (webapp + Dagster + DB)
make up               # Start PostgreSQL + pgweb only
make down             # Stop services
make webapp           # Start Next.js only
make dagster          # Start Dagster only
make psql             # Connect to PostgreSQL CLI
make db-push          # Push Drizzle schema to database
make db-seed          # Seed test user
make materialize      # Materialize all Dagster assets
```

### Data Platform (from data-platform/)

```bash
make setup            # Install Python dependencies
make dagster          # Start Dagster UI
make test             # Run pytest
make lint             # Run ruff linter
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   docker compose                      │
│                                                       │
│  ┌────────────┐   ┌────────────┐   ┌──────────────┐ │
│  │ PostgreSQL  │   │  webapp    │   │ dagster-     │ │
│  │ :5432       │◄──│  :3000     │   │ webserver    │ │
│  │             │   └────────────┘   │ :3001        │ │
│  │             │◄───────────────────│              │ │
│  │             │   ┌────────────┐   └──────────────┘ │
│  │             │◄──│ dagster-   │                     │
│  │             │   │ daemon     │   ┌──────────────┐ │
│  └────────────┘   └────────────┘   │ pgweb :8081  │ │
│                                     └──────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Data Flow

```
Zillow CSVs → Python ingestion → Parquet files
                                     ↓
                              Polars transforms
                                     ↓
                              PostgreSQL app.* → Next.js API → React UI
```

### Databases

| Database | Purpose |
|----------|---------|
| `housingiq` | Application data (users, regions, ZHVI/ZORI values, market summary) |
| `dagster` | Dagster internal storage (run history, event logs, schedules) |

### Key Tables

- `app.regions` - Geographic regions (state, metro, county, city)
- `app.zhvi_values` - Zillow Home Value Index time series
- `app.zori_values` - Zillow Observed Rent Index time series
- `app.market_summary` - Pre-computed dashboard metrics
- `app.inventory_values` - For-sale inventory over time
- `app.market_heat_index` - Market temperature index
- `app.affordability_metrics` - Mortgage payments, income needed

## Environment Variables

Docker Compose injects all required env vars automatically. For local dev or Google OAuth, create a `.env` at the project root:

```env
# Auth (generate with: openssl rand -base64 32)
AUTH_SECRET=super-secret-change-me-in-production

# Google OAuth (optional - leave empty for email/password only)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

For local dev, also create `webapp/.env.local`:

```env
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5432/housingiq
AUTH_SECRET=your-secret-key
AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Data Platform** | |
| Orchestration | Dagster |
| Transformations | Polars |
| Data Quality | Great Expectations |
| Database | PostgreSQL 16 |
| **Webapp** | |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| ORM | Drizzle ORM |
| Auth | NextAuth.js v5 + Google OAuth |
| Charts | Recharts |
| **Infrastructure** | |
| Containers | Docker Compose |
| Images | Node 20 Alpine, Python 3.11 Slim |

## Data Source

Data sourced from [Zillow Research](https://www.zillow.com/research/data/):

- **ZHVI** - Zillow Home Value Index (home values)
- **ZORI** - Zillow Observed Rent Index (rents)

## Dev Account

```
Email:    test@housingiq.com
Password: TestPassword123!
```

## Production Deployment

### Overview

Production uses Docker Compose for the data pipeline (Dagster + PostgreSQL) and Neon as the production database for the webapp.

```
Local/CI Server (Docker Compose)          Cloud (Neon + Vercel)
┌────────────────────────────────┐        ┌─────────────────────┐
│  Dagster → Polars → PostgreSQL │──sync──▶│  Neon PostgreSQL    │
│  (data pipeline)               │        │       ↑              │
└────────────────────────────────┘        │  Vercel (webapp)    │
                                          └─────────────────────┘
```

### Step 1: Run the Data Pipeline

```bash
# Start all services
make docker-build && make docker-up && make docker-init

# Materialize all assets (downloads Zillow data, transforms, loads to local DB)
# Use the Dagster UI at http://localhost:3001 or:
docker exec housingiq-dagster-webserver \
  dagster asset materialize --select "*" -m housingiq_dagster.definitions
```

### Step 2: Sync to Production Database (Neon)

```bash
# Dry run first to see what will be synced
NEON_DATABASE_URL='postgresql://user:pass@host/db?sslmode=require' make sync-to-neon-dry

# Sync app schema tables to Neon
NEON_DATABASE_URL='postgresql://user:pass@host/db?sslmode=require' make sync-to-neon
```

### Step 3: Deploy the Webapp

The webapp deploys to Vercel via the [HousingIQ/webapp](https://github.com/HousingIQ/webapp) repo, which is auto-synced from this monorepo via GitHub Actions.

Required Vercel environment variables:

```env
DATABASE_URL=postgresql://...@neon.tech/housingiq?sslmode=require
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_URL=https://your-domain.vercel.app
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

### Production Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEON_DATABASE_URL` | CI/local `.env` | Neon connection string for data sync |
| `DATABASE_URL` | Vercel | Neon connection string for webapp |
| `AUTH_SECRET` | Vercel | NextAuth.js secret (must be unique per environment) |
| `AUTH_URL` | Vercel | Public URL of the webapp |
| `GOOGLE_CLIENT_ID` | Vercel | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Vercel | Google OAuth client secret |

## License

MIT

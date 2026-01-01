# HousingIQ

Housing analytics web application powered by Zillow data, featuring a modern data platform with Dagster and Polars.

## Quick Start

```bash
# First-time setup (installs everything, starts database, pushes schema)
make setup

# Start all services for development
make dev
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **pgweb** (database UI) on `http://localhost:8081`
- **Next.js webapp** on `http://localhost:3000`
- **Dagster UI** on `http://localhost:3001`

## Project Structure

```
housingiq-app/                    # Monorepo root
├── data-platform/                # Data engineering stack
│   ├── housingiq_dagster/       # Dagster assets & orchestration
│   ├── ingestion/               # Data source connectors (Zillow)
│   ├── great_expectations/      # Data quality validation
│   └── tests/                   # Python tests
│
├── webapp/                       # Next.js full-stack web application
│   ├── src/
│   │   ├── app/                 # App Router pages & API routes
│   │   ├── components/          # UI components
│   │   └── lib/                 # Utilities, DB, Auth
│   └── .env.local               # Webapp environment variables
│
├── docker-compose.yml           # Shared PostgreSQL + pgweb
├── Makefile                     # Project orchestration commands
└── CLAUDE.md                    # AI assistant guidance
```

## Prerequisites

- Docker & Docker Compose
- Python 3.11+ (recommend using conda)
- Node.js 18+ and npm

## Manual Setup (Alternative)

### Step 1: Start Infrastructure

```bash
make up  # Starts PostgreSQL + pgweb
```

### Step 2: Set Up Data Platform

```bash
# Create conda environment (optional but recommended)
conda create -n housingiq python=3.11 -y
conda activate housingiq

# Install data platform
cd data-platform
pip install -e ".[dev]"
```

### Step 3: Set Up Webapp

```bash
cd webapp
cp .env.example .env.local  # Edit with your settings
npm install
npm run db:push  # Push schema to database
```

### Step 4: Run the Data Pipeline

```bash
# Start Dagster UI
make dagster  # or from root: make dagster

# Then in Dagster UI (http://localhost:3001):
# 1. Navigate to Assets
# 2. Click "Materialize all" to run the full pipeline
```

## Available Commands

### From Root Directory

```bash
make help          # Show all commands
make setup         # First-time setup
make dev           # Start all services
make up            # Start PostgreSQL + pgweb
make down          # Stop services
make psql          # Connect to PostgreSQL
make webapp        # Start Next.js only
make dagster       # Start Dagster only
make db-push       # Push Drizzle schema
make db-seed       # Seed test user
make materialize   # Materialize all Dagster assets
```

### From data-platform/

```bash
make help          # Show all commands
make setup         # Install dependencies
make dagster       # Start Dagster UI
make test          # Run Python tests
make lint          # Run linter
```

## Environment Variables

### Webapp (webapp/.env.local)

```env
# Database connection
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5432/housingiq

# NextAuth.js
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (https://console.cloud.google.com/apis/credentials)
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
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Drizzle ORM |
| Auth | NextAuth.js v5 + Google OAuth |
| Charts | Recharts |

## Data Pipeline

```
Zillow CSVs → Python ingestion → Parquet files
                                     ↓
                              Polars transforms
                                     ↓
                              PostgreSQL app.* → Next.js API → React UI
```

### Key Tables

- `app.regions` - Geographic regions (state, metro, county, city)
- `app.zhvi_values` - Zillow Home Value Index time series
- `app.zori_values` - Zillow Observed Rent Index time series
- `app.market_summary` - Pre-computed dashboard metrics

## Data Source

Data sourced from [Zillow Research](https://www.zillow.com/research/data/):

- **ZHVI** - Zillow Home Value Index (home values)
- **ZORI** - Zillow Observed Rent Index (rents)

## License

MIT

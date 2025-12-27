# HousingIQ

Housing analytics web application powered by Zillow data, featuring a modern data platform with dbt, Dagster, and Great Expectations.

## Project Structure

```
housingiq-app/                    # Monorepo root
├── webapp/                       # Next.js full-stack web application
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   ├── components/          # UI components
│   │   └── lib/                 # Utilities, DB, Auth
│   └── .env.local               # Webapp environment variables
│
├── data-platform/                # Data engineering stack
│   ├── ingestion/               # Data source connectors (Zillow)
│   ├── dagster/                 # Orchestration (software-defined assets)
│   ├── dbt/                     # SQL transformations
│   ├── great_expectations/      # Data quality validation
│   └── tests/                   # Python tests
│
├── docker-compose.yml           # Shared PostgreSQL + pgweb
├── init-db/                     # Database initialization scripts
├── Makefile                     # Project orchestration commands
└── docs/                        # Documentation
```

## How to Run This Project

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ and npm
- Python 3.11+
- Conda (recommended for Python environment management)

### Step 1: Clone and Navigate

```bash
git clone <your-repo-url>
cd housingiq
```

### Step 2: Start the Database

```bash
cd housingiq-app
make up
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **pgweb** (database UI) on `http://localhost:8081`

### Step 3: Set Up the Webapp

```bash
cd webapp

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your settings (see Environment Variables section)

# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Visit **http://localhost:3000**

### Step 4: Set Up the Data Platform

```bash
# Create conda environment
conda create -n housingiq python=3.11 -y
conda activate housingiq

# Install data platform (from housingiq-app root)
cd data-platform
pip install -e ".[dev]"

# Install dbt packages
cd dbt && dbt deps && cd ..

# Start Dagster UI
make dagster
```

Visit **http://localhost:3000** (Dagster UI)

### Step 5: Run the Data Pipeline

**Option A: Using Dagster UI**
1. Open http://localhost:3000
2. Navigate to Assets
3. Click "Materialize all" to run the full pipeline

**Option B: Using Command Line**
```bash
cd data-platform
make download      # Download Zillow data
make dbt-run       # Run dbt transformations
```

## Environment Variables

### Webapp (`webapp/.env.local`)

```env
# Database connection
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5432/housingiq

# NextAuth.js
NEXTAUTH_SECRET=your-secret-key-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Data Platform

The data platform reads `DATABASE_URL` from environment or uses defaults:
```bash
export DATABASE_URL=postgresql://housingiq:housingiq@localhost:5432/housingiq
```

## Available Commands

### From `housingiq-app/`

```bash
make help          # Show all commands
make up            # Start PostgreSQL + pgweb
make down          # Stop services
make psql          # Connect to PostgreSQL
make webapp        # Start Next.js dev server
make dagster       # Start Dagster UI
make dbt           # Run dbt build
```

### From `data-platform/`

```bash
make help          # Show all commands
make setup         # Install dependencies + dbt packages
make dagster       # Start Dagster UI
make download      # Download Zillow data
make dbt-run       # Run all dbt models
make dbt-test      # Run dbt tests
make test          # Run Python tests
make lint          # Run linter
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Webapp** | |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Drizzle ORM |
| Auth | NextAuth.js v5 + Google OAuth |
| Charts | Recharts |
| **Data Platform** | |
| Orchestration | Dagster |
| Transformations | dbt |
| Data Quality | Great Expectations |
| Processing | Polars |
| Database | PostgreSQL 16 |

## Database Schema

### Schemas

- `raw` - Raw data loaded from external sources
- `staging` - Cleaned and validated data (dbt views)
- `analytics` - Dimensional models (dbt tables)
- `app` - Tables consumed by the webapp

### Key Tables

- `app.regions` - Geographic regions (state, metro, county, city, zip)
- `app.zhvi_values` - Zillow Home Value Index time series
- `analytics.fct_zhvi_values` - ZHVI with MoM/YoY calculations
- `analytics.fct_zori_values` - ZORI (rental) with calculations
- `analytics.agg_regional_summary` - Pre-computed dashboard metrics

## Data Source

Data sourced from [Zillow Research](https://www.zillow.com/research/data/):

- **ZHVI** - Zillow Home Value Index (home values)
- **ZORI** - Zillow Observed Rent Index (rents)
- **Inventory** - For-sale listings data
- **Forecasts** - Price and rent predictions

## Documentation

See the [docs/](./docs/) folder:

- [Overview](./docs/01-overview.md) - Project introduction
- [Architecture](./docs/02-architecture.md) - System design
- [Database Schema](./docs/03-database-schema.md) - Tables and queries
- [Data Platform](./docs/09-data-platform.md) - dbt + Dagster architecture
- [Zillow Data Source](./docs/10-zillow-data-source.md) - Data ingestion details

## License

MIT

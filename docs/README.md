# HousingIQ Documentation

## Table of Contents

| Document | Description |
|----------|-------------|
| [01-overview.md](./01-overview.md) | Project introduction and goals |
| [02-architecture.md](./02-architecture.md) | System architecture and component design |
| [03-database-schema.md](./03-database-schema.md) | Database tables, relationships, and queries |
| [04-authentication.md](./04-authentication.md) | Google OAuth and NextAuth.js configuration |
| [05-frontend.md](./05-frontend.md) | React components, pages, and styling |
| [06-data-pipeline.md](./06-data-pipeline.md) | Legacy Airflow setup (archived) |
| [07-setup-guide.md](./07-setup-guide.md) | Step-by-step installation instructions |
| [08-api-reference.md](./08-api-reference.md) | API endpoints and data types |
| [09-data-platform.md](./09-data-platform.md) | **Data Platform** - dbt, Dagster, Great Expectations |
| [10-zillow-data-source.md](./10-zillow-data-source.md) | **Zillow Data Source** - Scraping, downloading, ETL |

## Quick Links

### Getting Started
- [Setup Guide](./07-setup-guide.md) - Start here for installation
- [Data Platform Quick Start](./09-data-platform.md#quick-start)

### Architecture
- [System Overview](./01-overview.md#high-level-architecture)
- [Repository Structure](./09-data-platform.md#repository-structure)
- [Data Model (Star Schema)](./09-data-platform.md#star-schema-design)

### Data Platform
- [Architecture Diagram](./09-data-platform.md#architecture-diagram)
- [dbt Transformations](./09-data-platform.md#2-dbt-transformations)
- [Dagster Orchestration](./09-data-platform.md#1-dagster-orchestration)
- [Data Quality (Great Expectations)](./09-data-platform.md#3-great-expectations-data-quality)
- [Adding New Data Sources](./09-data-platform.md#adding-a-new-data-source)

### Data Sources
- [Zillow Data Source](./10-zillow-data-source.md) - Scraper, downloader, ETL
- [Zillow Data Schema](./10-zillow-data-source.md#data-schema)
- [Migration to Dagster](./10-zillow-data-source.md#migration-to-data-platform)

### Development
- [Frontend Components](./05-frontend.md)
- [Authentication Flow](./04-authentication.md#authentication-flow)
- [API Reference](./08-api-reference.md)

## Repository Structure

```
housingiq/
├── housingiq-app/                  # Main application
│   ├── docker-compose.yml          # Shared PostgreSQL infrastructure
│   ├── Makefile                    # Root-level commands
│   ├── init-db/                    # Database initialization scripts
│   │
│   ├── data-platform/              # Data Engineering (future)
│   │   ├── dagster/                # Orchestration (localhost:3000)
│   │   ├── dbt/                    # Transformations + contracts
│   │   ├── great_expectations/     # Data quality
│   │   ├── ingestion/              # Python extraction code
│   │   └── data/                   # Local data lake
│   │
│   ├── webapp/                     # Next.js Application
│   │   ├── src/app/                # Pages and API routes
│   │   ├── src/components/         # React components
│   │   └── src/lib/db/             # Drizzle ORM
│   │
│   └── docs/                       # Documentation
│
└── zillow_data_sc/                 # Zillow Data Source (to be migrated)
    ├── scrapper.py                 # URL generator (150+ files)
    ├── downloader.py               # Parallel CSV downloader
    ├── etl_zhvi.py                 # Wide → long transformation
    ├── manifest.json               # Auto-generated URL catalog
    ├── data/                       # Downloaded CSVs
    └── data_processed/             # Parquet files
```

## Tech Stack

### Data Platform

| Category | Technology | Purpose |
|----------|------------|---------|
| **Orchestration** | Dagster | Software-defined assets, lineage |
| **Transformations** | dbt | SQL models, contracts, testing |
| **Data Quality** | Great Expectations | Validation suites |
| **Processing** | Polars | Fast DataFrame operations |
| **Storage** | PostgreSQL | OLTP database |

### Web Application

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 16 | React server components |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Charts** | Recharts | Data visualization |
| **ORM** | Drizzle | Type-safe database access |
| **Auth** | NextAuth.js v5 | Google OAuth |

### Infrastructure

| Category | Technology | Purpose |
|----------|------------|---------|
| **Database** | PostgreSQL 16 | Primary data store |
| **Containers** | Docker Compose | Local development |
| **DB Browser** | pgweb | Database UI (localhost:8081) |

## Local Services

| Service | URL | Description |
|---------|-----|-------------|
| **Dagster UI** | http://localhost:3000 | Orchestration dashboard, asset lineage |
| **Next.js App** | http://localhost:3001 | Web application |
| **dbt Docs** | http://localhost:8080 | Data catalog and documentation |
| **pgweb** | http://localhost:8081 | Database browser |
| **PostgreSQL** | localhost:5432 | Database connection |

## Quick Start

```bash
# 1. Start shared infrastructure
cd housingiq-app
make up

# 2. Run data platform
cd data-platform
pip install -e ".[dev]"
dagster dev                     # Opens localhost:3000

# 3. Run webapp (in another terminal)
cd webapp
npm install
npm run dev                     # Opens localhost:3001
```

## Data Engineering Patterns Demonstrated

This project showcases production-grade data engineering:

| Pattern | Implementation |
|---------|----------------|
| **ELT Pipeline** | Staging → Intermediate → Marts |
| **Incremental Loading** | dbt `is_incremental()` with merge |
| **Schema Contracts** | dbt contracts with `enforced: true` |
| **Data Quality Gates** | Great Expectations before load |
| **Idempotent Operations** | Merge strategy, no truncate |
| **Automatic Lineage** | Dagster + dbt docs |
| **Star Schema** | dim_regions, fct_zhvi_values |
| **SCD Type 2 Ready** | valid_from, valid_to, is_current |

## Development Status

### Completed
- [x] Next.js webapp with authentication
- [x] PostgreSQL database with Drizzle ORM
- [x] Dashboard with ZHVI charts
- [x] Data platform architecture design

### In Progress
- [ ] Implement Dagster assets for ingestion
- [ ] Create dbt models (staging, marts)
- [ ] Set up Great Expectations suites
- [ ] Connect webapp to analytics schema

### Planned
- [ ] Add Redfin data source
- [ ] Add Census demographic data
- [ ] Implement metro/city/zip drill-down
- [ ] Production deployment

# Overview

## Introduction

**HousingIQ** is a modern housing market analytics platform that provides real-time insights into home values, rent prices, and market trends across the United States. Built with a production-grade data engineering stack and a fast, responsive web interface, HousingIQ demonstrates best practices in modern full-stack development and data pipeline architecture.

## Project Goals

1. **Real-Time Market Analytics**: Provide up-to-date housing market data for informed decision-making
2. **Data Engineering Excellence**: Showcase modern ELT patterns with Dagster, Polars, and PostgreSQL
3. **User-Friendly Interface**: Deliver an intuitive, fast, and beautiful web experience
4. **Scalable Architecture**: Build with patterns that support growth from states to ZIP codes

## Key Features

### For End Users

- 🏠 **Market Overview Dashboard**: View median home prices, rent values, and trends at a glance
- 📊 **Interactive Charts**: Visualize ZHVI (home values) and ZORI (rent) time series data
- 🔍 **Location Search**: Find and compare markets by state, metro, county, or city
- 📈 **Rankings**: Discover fastest-growing markets and best investment opportunities
- 🧮 **ROI Calculator**: Calculate potential returns on real estate investments
- 🗺️ **Geographic Comparison**: Compare multiple markets side-by-side

### For Data Engineers

- ⚡ **Modern Data Stack**: Dagster + Polars + PostgreSQL + Great Expectations
- 🔄 **ELT Pipeline**: Extract from Zillow → Load to local Parquet → Transform with Polars → Load to PostgreSQL
- 📦 **Asset-Based Orchestration**: Software-defined assets with automatic lineage tracking
- ✅ **Data Quality Gates**: Validation with Great Expectations before loading
- 🚀 **High Performance**: Polars for multi-threaded, zero-copy DataFrame operations
- 📐 **Star Schema**: Dimensional modeling with fact and dimension tables

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                            │
│                     Zillow Research Data                        │
│                  (CSV files from zillow.com)                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA INGESTION                              │
│              Python ingestion/ module                           │
│   ┌──────────────────────────────────────────────────────┐     │
│   │  • Zillow Scraper (get download URLs)               │     │
│   │  • Zillow Downloader (fetch CSVs)                   │     │
│   │  • Zillow Transformer (parse → Parquet)             │     │
│   └──────────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL DATA LAKE                              │
│              data/processed/*.parquet                           │
│   ┌──────────────────────────────────────────────────────┐     │
│   │  • zhvi_regions.parquet                              │     │
│   │  • zhvi_values.parquet                               │     │
│   │  • zori_regions.parquet                              │     │
│   │  • zori_values.parquet                               │     │
│   └──────────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               DATA TRANSFORMATIONS (Polars)                     │
│              Dagster assets/transforms.py                       │
│   ┌──────────────────────────────────────────────────────┐     │
│   │  • dim_regions (dimension table)                     │     │
│   │  • fct_zhvi_values (with YoY/MoM calculations)      │     │
│   │  • fct_zori_values (with YoY/MoM calculations)      │     │
│   │  • market_summary (pre-aggregated dashboard data)   │     │
│   └──────────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                DATA QUALITY VALIDATION                          │
│                  Great Expectations                             │
│   ┌──────────────────────────────────────────────────────┐     │
│   │  • Schema validation                                 │     │
│   │  • Value range checks                                │     │
│   │  • Completeness tests                                │     │
│   │  • Referential integrity                             │     │
│   └──────────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE LOADING                               │
│              Dagster assets/database.py                         │
│   ┌──────────────────────────────────────────────────────┐     │
│   │  • app.regions                                       │     │
│   │  • app.zhvi_values                                   │     │
│   │  • app.zori_values                                   │     │
│   │  • app.market_summary                                │     │
│   └──────────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                          │
│                    app.* schema tables                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS WEB APP                              │
│              webapp/ (Next.js 15 + App Router)                  │
│   ┌──────────────────────────────────────────────────────┐     │
│   │  API Routes (app/api/market/*)                       │     │
│   │      ↓                                                │     │
│   │  Drizzle ORM (lib/db/schema.ts)                      │     │
│   │      ↓                                                │     │
│   │  React Components + Server Components                │     │
│   └──────────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                      🌐 End Users
```

## Technology Stack

### Data Platform

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Orchestration** | Dagster 1.6+ | Software-defined assets, DAG management, lineage tracking |
| **Transformations** | Polars 0.20+ | High-performance DataFrame operations (replaces dbt/Spark) |
| **Data Quality** | Great Expectations 0.18+ | Automated data validation and testing |
| **Storage (Raw)** | Parquet Files | Columnar storage for processed data |
| **Storage (Serving)** | PostgreSQL 16 | OLTP database for webapp queries |
| **Database Connectivity** | ADBC + SQLAlchemy | Fast bulk loading with Apache Arrow |

### Web Application

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Next.js 15 (App Router) | React server components, API routes, SSR |
| **Language** | TypeScript 5+ | Type safety across frontend and backend |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS + accessible components |
| **ORM** | Drizzle ORM | Type-safe database queries |
| **Authentication** | NextAuth.js v5 | Google OAuth + email/password |
| **Charts** | Recharts | React chart library for data visualization |
| **State Management** | React Hooks | Built-in hooks + Server Components |

### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Database** | PostgreSQL 16 | Primary data store |
| **Containerization** | Docker Compose | Local development infrastructure |
| **Database Browser** | pgweb | Web-based database UI |

## Data Sources

Currently integrated:

### Zillow Research Data
- **ZHVI (Zillow Home Value Index)**: Monthly median home values
- **ZORI (Zillow Observed Rent Index)**: Monthly median rent values
- **Coverage**: National, State, Metro, County, City, and ZIP code levels
- **Update Frequency**: Monthly (published ~15th of each month)
- **Source**: https://www.zillow.com/research/data/

## Project Structure

```
housingiq-app/                    # Monorepo root
├── data-platform/                # Data engineering stack
│   ├── housingiq_dagster/       # Dagster assets & orchestration
│   │   ├── assets/
│   │   │   ├── zillow.py        # Ingestion assets
│   │   │   ├── transforms.py    # Polars transformations
│   │   │   └── database.py      # PostgreSQL loading
│   │   ├── definitions.py       # Dagster definitions
│   │   ├── resources.py         # Shared resources
│   │   ├── schedules.py         # Scheduled jobs
│   │   └── sensors.py           # Event-driven triggers
│   ├── ingestion/               # Data source connectors
│   │   └── sources/zillow/      # Zillow-specific code
│   ├── great_expectations/      # Data quality validation
│   ├── data/                    # Local data lake
│   │   ├── zhvi/                # Raw ZHVI CSVs
│   │   ├── zori/                # Raw ZORI CSVs
│   │   └── processed/           # Transformed Parquet files
│   ├── tests/                   # Python tests
│   ├── pyproject.toml           # Python dependencies
│   └── Makefile                 # Data platform commands
│
├── webapp/                       # Next.js full-stack web application
│   ├── src/
│   │   ├── app/                 # App Router pages & API routes
│   │   │   ├── api/market/      # Market data API endpoints
│   │   │   ├── dashboard/       # Dashboard pages
│   │   │   ├── login/           # Authentication pages
│   │   │   └── page.tsx         # Landing page
│   │   ├── components/          # React components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── LocationSearchBar.tsx
│   │   │   ├── MarketOverviewCard.tsx
│   │   │   └── PriceTrendChart.tsx
│   │   └── lib/                 # Utilities, DB, Auth
│   │       ├── db/              # Drizzle ORM
│   │       │   ├── schema.ts    # Database schema
│   │       │   └── index.ts     # DB client
│   │       └── auth/            # NextAuth.js config
│   ├── package.json             # Node.js dependencies
│   └── .env.local               # Webapp environment variables
│
├── docker-compose.yml           # PostgreSQL + pgweb
├── init-db/                     # Database initialization
├── Makefile                     # Root orchestration commands
└── docs/                        # Documentation
```

## Development Workflow

### 1. First-Time Setup

```bash
# Start infrastructure (PostgreSQL + pgweb)
make up

# Install all dependencies and set up database
make setup

# This runs:
# - pip install -e ".[dev]" (data platform)
# - npm install (webapp)
# - npm run db:push (create database schema)
# - npm run db:seed-test-user (create test account)
```

### 2. Start Development

```bash
# Option A: Start all services together
make dev

# Option B: Start services individually
make webapp    # Next.js on localhost:3000
make dagster   # Dagster UI on localhost:3001
```

### 3. Run Data Pipeline

```bash
# Open Dagster UI at http://localhost:3001
# Click "Materialize all" to run the full pipeline

# Or use CLI:
make materialize
```

### 4. View Application

- **Webapp**: http://localhost:3000
- **Dagster UI**: http://localhost:3001
- **Database UI (pgweb)**: http://localhost:8081

## Key Differentiators

### Why Polars Instead of dbt/Spark?

1. **Performance**: 10-100x faster than Pandas, competes with Spark for many workloads
2. **Simplicity**: Pure Python, no JVM, no cluster management
3. **Memory Efficiency**: Lazy evaluation, streaming, zero-copy operations
4. **Developer Experience**: Better error messages, intuitive API
5. **Local Development**: Runs fast on a laptop, same code in production

### Why Dagster Instead of Airflow?

1. **Software-Defined Assets**: Model data as assets, not tasks
2. **Type System**: Strong typing with Python hints and Pydantic
3. **Development Experience**: Fast feedback loop, better testing
4. **Lineage**: Automatic data lineage tracking
5. **Modern Architecture**: Built for cloud-native, not bolted on

## Current Status

### ✅ Completed Features

- [x] Data ingestion from Zillow Research
- [x] Polars-based ETL pipeline with Dagster orchestration
- [x] PostgreSQL database with optimized schema
- [x] Next.js webapp with authentication (Google OAuth + email/password)
- [x] Market overview dashboard with charts
- [x] State-level market data and comparisons
- [x] Location search functionality
- [x] Market rankings (hot/cold markets)
- [x] Price trend visualizations
- [x] Calculator tools (ROI, price-to-rent)

### 🚧 In Progress

- [ ] Metro and county-level drill-downs
- [ ] ZIP code data (Pro tier feature)
- [ ] Advanced filtering and sorting
- [ ] Export to CSV/PDF
- [ ] Email alerts for market changes

### 📋 Planned Features

- [ ] Additional data sources (Redfin, Census)
- [ ] Machine learning price predictions
- [ ] User portfolios and watchlists
- [ ] Mobile app (React Native)
- [ ] Public API with rate limiting

## Performance Characteristics

| Metric | Current Performance |
|--------|-------------------|
| Full pipeline runtime | ~5-10 minutes (State/Metro/County/City) |
| Dashboard page load | <500ms (server-side rendering) |
| API response time | <100ms (pre-aggregated data) |
| Chart rendering | <50ms (client-side) |
| Database size | ~2GB (5 geography levels, 20 years history) |

## Getting Help

- **Documentation**: See [docs/README.md](./README.md) for full documentation index
- **Setup Issues**: Check [07-setup-guide.md](./07-setup-guide.md)
- **Data Platform**: Read [09-data-platform.md](./09-data-platform.md)
- **API Reference**: See [08-api-reference.md](./08-api-reference.md)

## License

MIT License - See LICENSE file for details

## Next Steps

To get started with development:
1. Follow the [Setup Guide](./07-setup-guide.md)
2. Read [Architecture](./02-architecture.md) to understand system design
3. Explore [Data Platform](./09-data-platform.md) for data engineering details

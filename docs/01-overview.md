# HousingIQ - Project Overview

## Introduction

HousingIQ is a housing analytics web application that provides insights into US housing market trends using Zillow data. The application features interactive visualizations, geographic comparisons, and historical trend analysis.

## Project Goals

1. **Visualize Housing Data**: Display Zillow Home Value Index (ZHVI) trends over time
2. **Geographic Analysis**: Compare housing values across states, metros, cities, and zip codes
3. **User Authentication**: Secure access via Google OAuth
4. **Data Pipeline**: Automated ETL process using Apache Airflow

## High-Level Architecture

```mermaid
graph TB
    subgraph "Data Sources"
        Z[Zillow Research Data]
        P[Parquet Files]
    end

    subgraph "Data Pipeline"
        A[Apache Airflow]
        E[ETL Scripts]
    end

    subgraph "Backend"
        DB[(PostgreSQL)]
        API[Next.js API Routes]
        AUTH[NextAuth.js]
    end

    subgraph "Frontend"
        LP[Landing Page]
        DASH[Dashboard]
        COMP[Compare Page]
    end

    subgraph "External Services"
        G[Google OAuth]
        N[Neon Postgres - Prod]
    end

    Z --> P
    P --> A
    A --> E
    E --> DB
    DB --> API
    API --> DASH
    API --> COMP
    AUTH --> G
    LP --> AUTH
    DB -.-> N
```

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 16.1.1 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui + Radix UI | - |
| Database | PostgreSQL | 16 |
| ORM | Drizzle ORM | 0.45.x |
| Authentication | NextAuth.js | 5.0 (beta) |
| Charts | Recharts | 3.x |
| Data Pipeline | Apache Airflow | 2.8.x |
| Data Processing | Polars (Python) | 0.20.x |

## Project Structure

```
housingiq-app/
├── webapp/                    # Next.js application
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── page.tsx      # Landing page
│   │   │   ├── login/        # Login page
│   │   │   ├── dashboard/    # Protected dashboard
│   │   │   └── api/          # API routes
│   │   ├── components/       # React components
│   │   │   └── ui/           # UI components
│   │   └── lib/              # Utilities
│   │       ├── db/           # Database schema & queries
│   │       └── auth/         # Authentication config
│   ├── docker-compose.yml    # Local PostgreSQL
│   └── drizzle.config.ts     # Drizzle ORM config
├── data-pipeline/            # Airflow setup
│   ├── dags/                 # DAG definitions
│   ├── scripts/              # ETL scripts
│   └── docker-compose.yml    # Airflow services
└── docs/                     # Documentation
```

## Key Features

### Implemented

- [x] Next.js 16 application with App Router
- [x] Google OAuth authentication
- [x] Landing page with feature preview
- [x] Dashboard with ZHVI charts
- [x] State comparison functionality
- [x] Drizzle ORM database schema
- [x] Docker Compose for local PostgreSQL
- [x] Airflow data pipeline setup
- [x] ETL scripts for loading parquet data

### Planned

- [ ] Real data integration (connect dashboard to database)
- [ ] Metro/City/Zip level drill-down
- [ ] Rental price (ZORI) visualization
- [ ] Market forecasts display
- [ ] Export functionality
- [ ] User preferences storage

## Data Source

Data is sourced from [Zillow Research](https://www.zillow.com/research/data/):

- **ZHVI**: Zillow Home Value Index (122M+ records)
- **ZORI**: Zillow Observed Rent Index
- **Inventory**: For-sale listings data
- **Forecasts**: Home value predictions

Geographic coverage:
- 50 States
- 3,000+ Counties
- 900+ Metro areas
- 30,000+ Cities
- 27,000+ Neighborhoods
- 15,000+ Zip codes

# HousingIQ

Housing analytics web application powered by Zillow data.

## Documentation

See the [docs/](./docs/) folder for detailed documentation:

- [Overview](./docs/01-overview.md) - Project introduction
- [Architecture](./docs/02-architecture.md) - System design
- [Database Schema](./docs/03-database-schema.md) - Tables and queries
- [Authentication](./docs/04-authentication.md) - Google OAuth setup
- [Frontend](./docs/05-frontend.md) - React components
- [Data Pipeline](./docs/06-data-pipeline.md) - Airflow ETL (legacy)
- [Setup Guide](./docs/07-setup-guide.md) - Installation steps
- [API Reference](./docs/08-api-reference.md) - Endpoints
- [Data Platform](./docs/09-data-platform.md) - Multi-source data platform architecture

## Project Structure

```
housingiq-app/
├── webapp/                    # Next.js full-stack application
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── components/       # UI components
│   │   └── lib/              # Utilities, DB, Auth
│   └── docker-compose.yml    # Local Postgres
├── data-pipeline/            # Airflow DAGs
│   ├── dags/                 # Airflow DAG definitions
│   ├── scripts/              # ETL scripts
│   └── docker-compose.yml    # Local Airflow
├── docs/                     # Documentation
└── README.md
```

## Quick Start

### 1. Start the Database

```bash
cd webapp
docker compose up -d
```

This starts PostgreSQL on port **5432**.

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Google OAuth credentials:
- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Create OAuth 2.0 credentials
- Set authorized redirect URI to `http://localhost:3000/api/auth/callback/google`

### 3. Run Database Migrations

```bash
npm run db:push
```

### 4. Start the Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Data Pipeline

### Start Airflow

```bash
cd data-pipeline
docker compose up -d
```

Airflow UI: http://localhost:8080 (admin/admin)

### Load Data

1. Open Airflow UI
2. Find the `load_zillow_data` DAG
3. Trigger the DAG manually

This loads:
- Regions dimension table (75K regions)
- State-level ZHVI data (173K records)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (Docker/Neon) |
| ORM | Drizzle ORM |
| Auth | NextAuth.js v5 + Google OAuth |
| Charts | Recharts |
| Data Pipeline | Apache Airflow |

## Environment Variables

```env
# Database (port 5432 for local Docker)
DATABASE_URL=postgresql://housingiq:housingiq_dev@localhost:5432/housingiq

# NextAuth.js
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Database Schema

### Tables

- **users** - Google OAuth users
- **regions** - Geographic regions (state, county, metro, city, zip, neighborhood)
- **zhvi_values** - Zillow Home Value Index time series data

## Available Scripts

### Webapp

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

### Data Pipeline

```bash
docker compose up -d    # Start Airflow
docker compose down     # Stop Airflow
docker compose logs -f  # View logs
```

## Data Source

Data sourced from [Zillow Research](https://www.zillow.com/research/data/).

Available metrics:
- ZHVI (Zillow Home Value Index)
- ZORI (Zillow Observed Rent Index)
- Inventory and sales data
- Forecasts and market indicators

## License

MIT

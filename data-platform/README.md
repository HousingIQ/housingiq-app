# HousingIQ Data Platform

Data engineering platform for HousingIQ using Dagster, Polars, and Great Expectations.

## Prerequisites

- uv
- Python 3.11-3.13 (`uv` will use Python 3.12 via `.python-version`)
- PostgreSQL (via Docker: `make up` from root)

## Setup

```bash
make setup    # Install dependencies
```

Python dependencies are managed by `uv`; no global `dagster`, `pytest`, or
`great_expectations` installation is required.

## Project Structure

```
data-platform/
├── housingiq_dagster/   # Dagster assets, schedules, sensors
│   ├── assets/
│   │   ├── zillow.py    # Data ingestion from Zillow
│   │   ├── transforms.py # Polars transformations
│   │   └── database.py  # Load to PostgreSQL
│   ├── resources.py     # Shared resources
│   └── definitions.py   # Dagster entry point
├── ingestion/           # Data ingestion modules
├── great_expectations/  # Data validation
└── tests/               # Python tests
```

## Data Pipeline

The pipeline uses Polars for high-performance data transformations:

```
zillow_manifest → zillow_raw_files → zillow_zhvi_transformed
                                  → zillow_zori_transformed
                                           ↓
                           fact_zhvi_values (Polars)
                           fact_zori_values (Polars)
                           dimension_regions (Polars)
                           aggregate_market_summary (Polars)
                                           ↓
                           app.regions (PostgreSQL)
                           app.zhvi_values (PostgreSQL)
                           app.zori_values (PostgreSQL)
                           app.market_summary (PostgreSQL)
```

## Commands

```bash
make dagster              # Start Dagster UI (http://localhost:3003)
make dagster-materialize  # Materialize all assets
make test                 # Run tests
make lint                 # Run linter
```

## Neon Sync

Sync local `app` schema to Neon (production). Set `NEON_DATABASE_URL` in the repo root `.env` file.

```bash
# From repo root
make sync-to-neon

# Or directly
uv run python scripts/sync_to_neon.py              # Sync all tables
uv run python scripts/sync_to_neon.py --clean      # Drop all Neon tables first, then sync fresh
uv run python scripts/sync_to_neon.py --dry-run    # Preview what would be synced
```

## Region Filtering

The `app_regions` and `app_zhvi_values` assets use a "popular regions" filter to keep the database small (~167 MB, fits Neon free tier):

| Geography Level | Limit |
|----------------|-------|
| State | All (51) |
| Metro | Top 100 |
| County | Top 100 |
| City | Top 200 |

This gives ~450 regions with full ZHVI history (1996-present). Configured via `POPULAR_REGION_LIMITS` in `database.py`.

## Why Polars Instead of dbt?

For datasets with 100M+ rows, Polars provides:
- 10-20x faster transformations (in-memory parallel processing)
- No database round-trips for intermediate results
- Simpler debugging (pure Python)
- Lower infrastructure costs (no dbt Cloud needed)

## Github action
  What it does:

  - Triggers on push to main when files in webapp/ change
  - Checks out both repos
  - Syncs the webapp/ folder contents to the webapp repo
  - Commits with a reference to the source commit SHA

  Setup required:

  You need to create a deploy key for the webapp repo:

  1. Generate an SSH key pair:
  ssh-keygen -t ed25519 -C "housingiq-app-sync" -f webapp-deploy-key
  2. Add the public key to the webapp repo:
    - Go to https://github.com/HousingIQ/webapp/settings/keys
    - Click "Add deploy key"
    - Paste the contents of webapp-deploy-key.pub
    - Check "Allow write access"
  3. Add the private key as a secret in housingiq-app:
    - Go to https://github.com/HousingIQ/housingiq-app/settings/secrets/actions
    - Click "New repository secret"
    - Name: WEBAPP_DEPLOY_KEY
    - Value: paste the contents of webapp-deploy-key
  4. Push this workflow to housingiq-app

# Data Platform Architecture

The HousingIQ data platform uses Dagster for orchestration and Polars for high-performance data transformations.

## Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Orchestration** | Dagster | Asset-based pipeline management |
| **Transformations** | Polars | High-performance DataFrame operations |
| **Data Quality** | Great Expectations | Validation and testing |
| **Storage** | PostgreSQL | Final tables for webapp |

## Project Structure

```
data-platform/
├── housingiq_dagster/              # Dagster package
│   ├── __init__.py
│   ├── definitions.py              # Entry point
│   ├── resources.py                # Shared resources
│   ├── schedules.py                # Automation schedules
│   ├── sensors.py                  # Event-based triggers
│   └── assets/
│       ├── __init__.py
│       ├── zillow.py               # Data ingestion
│       ├── transforms.py           # Polars transformations
│       └── database.py             # PostgreSQL loading
│
├── ingestion/                      # Data extraction
│   └── sources/
│       └── zillow/                 # Zillow-specific logic
│           ├── __init__.py
│           ├── config.py           # URL patterns, categories, settings
│           ├── scraper.py          # URL generation from patterns
│           ├── downloader.py       # Parallel CSV downloader
│           ├── transformer.py      # CSV → Parquet transformation
│           └── schemas.py          # Pydantic data models
│
├── great_expectations/             # Data quality
│   ├── gx.yml                     # GX configuration
│   ├── checkpoints/
│   │   └── zillow_checkpoint.yml
│   └── expectations/
│       ├── zillow_regions_suite.json
│       ├── zillow_zhvi_values_suite.json
│       └── zillow_zori_values_suite.json
│
├── scripts/
│   └── sync_to_neon.py            # Production DB sync
│
├── tests/                          # Python tests
│   ├── conftest.py
│   ├── test_zillow_scraper.py
│   ├── test_zillow_transformer.py
│   └── test_zillow_schemas.py
│
├── data/                           # Local data storage (gitignored)
│   ├── zhvi/                       # Raw ZHVI CSVs
│   ├── zori/                       # Raw ZORI CSVs
│   ├── invt_fs/                    # Raw inventory CSVs
│   ├── market_temp_index/          # Raw market heat CSVs
│   ├── mortgage_payment/           # Raw mortgage payment CSVs
│   ├── total_monthly_payment/      # Raw total payment CSVs
│   ├── new_homeowner_income_needed/ # Raw homeowner income CSVs
│   ├── new_renter_income_needed/   # Raw renter income CSVs
│   └── processed/                  # Transformed Parquet files
│
├── pyproject.toml                  # Dependencies
├── dagster.yaml                    # Dagster config
└── Makefile                        # Commands
```

## Data Pipeline

```mermaid
graph TD
    subgraph Ingestion["Zillow Ingestion"]
        Z[Zillow CSVs] --> M[zillow_manifest]
        M --> R[zillow_raw_files]
        R --> TZ[zillow_zhvi_transformed]
        R --> TR[zillow_zori_transformed]
    end

    subgraph Transform["Polars Transformations"]
        TZ --> DR[dim_regions]
        TZ --> FZ[fct_zhvi_values]
        TR --> FR[fct_zori_values]
        FZ --> MS[market_summary]
        FR --> MS
        DR --> MS
    end

    subgraph Load["PostgreSQL app.*"]
        DR --> AR[app.regions]
        FZ --> AZ[app.zhvi_values]
        MS --> AM[app.market_summary]
    end
```

## Asset Groups

### 1. Ingestion (`zillow.py`)

Downloads and transforms Zillow CSV data to Parquet files.

| Asset | Description |
|-------|-------------|
| `zillow_manifest` | Scrapes Zillow data URLs from configured patterns |
| `zillow_raw_files` | Downloads CSV files for configured categories |
| `zillow_zhvi_transformed` | Transforms ZHVI CSVs to normalized Parquet |
| `zillow_zori_transformed` | Transforms ZORI CSVs to normalized Parquet |

**Configured download categories** (from `ingestion/sources/zillow/config.py`):

| Category | Description | Used in App |
|----------|-------------|-------------|
| `zhvi` | Zillow Home Value Index | Yes (primary) |
| `zori` | Zillow Observed Rent Index | Yes (rent data) |
| `invt_fs` | For-Sale Inventory | Downloaded but not loaded to app DB |
| `market_temp_index` | Market Heat Index | Downloaded but not loaded to app DB |
| `mortgage_payment` | Mortgage Payment Estimates | Downloaded but not loaded to app DB |
| `total_monthly_payment` | Total Monthly Payment Estimates | Downloaded but not loaded to app DB |
| `new_homeowner_income_needed` | Income Required (Homeowner) | Downloaded but not loaded to app DB |
| `new_renter_income_needed` | Income Required (Renter) | Downloaded but not loaded to app DB |

> **Note**: Only ZHVI and ZORI data are currently loaded to the PostgreSQL app database and used by the webapp. Other categories are downloaded and transformed to Parquet but not loaded to the app DB to keep the database size manageable.

### 2. Transforms (`transforms.py`)

Polars-based transformations with YoY/MoM calculations.

| Asset | Depends On | Description |
|-------|-----------|-------------|
| `dim_regions` | `zillow_zhvi_transformed` | Geographic dimension table with display names |
| `fct_zhvi_values` | `zillow_zhvi_transformed` | ZHVI fact table with MoM/YoY change metrics |
| `fct_zori_values` | `zillow_zori_transformed` | ZORI fact table with MoM/YoY change metrics |
| `market_summary` | `fct_zhvi_values`, `fct_zori_values`, `dim_regions` | Pre-computed market overview for dashboard |

### 3. Database Loading (`database.py`)

Loads final tables to PostgreSQL for the webapp using Polars ADBC bulk insert.

**Popular Region Filter:** Both `app_regions` and `app_zhvi_values` apply a conservative region filter to keep the database small enough for Neon free tier (~167 MB). The filter is defined in `POPULAR_REGION_LIMITS`:
- All States (no rank limit)
- Top 100 Metros (by size_rank)
- Top 100 Counties (by size_rank)
- Top 200 Cities (by size_rank)

This yields ~450 regions with full historical ZHVI data (1996-present) instead of all 26K regions with a 2-year date cutoff.

| Asset | Target Table | Source |
|-------|--------------|--------|
| `app_regions` | `app.regions` | `dim_regions` (filtered to popular regions) |
| `app_zhvi_values` | `app.zhvi_values` | `fct_zhvi_values` (filtered to popular regions, full history) |
| `app_market_summary` | `app.market_summary` | `market_summary` |

## Schedules

Defined in `schedules.py`. All schedules default to `STOPPED` and must be enabled manually.

| Schedule | Cron | Description |
|----------|------|-------------|
| `weekly_zillow_refresh` | `0 2 * * 0` (Sun 2 AM) | Re-download Zillow CSVs |
| `daily_database_load` | `0 3 * * *` (daily 3 AM) | Load transformed data to PostgreSQL |
| `monthly_full_refresh` | `0 1 1 * *` (1st of month 1 AM) | Full pipeline: download + transform + load |

## Sensors

Defined in `sensors.py`. Event-driven triggers for automated execution.

| Sensor | Type | Description |
|--------|------|-------------|
| `new_csv_sensor` | File-based | Triggers when new CSVs appear in `data/` (checks every 5 min) |
| `zhvi_transformed_sensor` | Asset-based | Triggers DB load when ZHVI transform completes |
| `zori_transformed_sensor` | Asset-based | Triggers DB load when ZORI transform completes |
| `data_freshness_sensor` | Health check | Alerts when processed data is older than 7 days (checks hourly) |

## Why Polars Instead of dbt?

For datasets with 100M+ rows, Polars provides significant advantages:

| Aspect | Polars | dbt |
|--------|--------|-----|
| **Speed** | 10-20x faster | Database-bound |
| **Memory** | Streaming, lazy eval | Full table scans |
| **Debugging** | Python debugger | SQL logs |
| **Complexity** | Single language | SQL + YAML + Jinja |
| **Infrastructure** | None | dbt Cloud or local |

## Running the Pipeline

### Start Dagster UI

```bash
cd data-platform
make dagster  # Opens http://localhost:3001
```

### Materialize All Assets

```bash
make dagster-materialize
```

### Or via CLI

```bash
dagster asset materialize --select "*" -m housingiq_dagster.definitions
```

## Configuration

### dagster.yaml

```yaml
storage:
  sqlite:
    base_dir: .dagster/storage

run_launcher:
  module: dagster.core.launcher
  class: DefaultRunLauncher

telemetry:
  enabled: false
```

### Environment Variables

```bash
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5432/housingiq
NEON_DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require  # For Neon sync
DATA_DIR=data  # Local data directory
```

### Neon Sync (`scripts/sync_to_neon.py`)

Syncs `app` schema tables from local PostgreSQL to Neon (production). Loads `.env` from the repo root automatically.

```bash
# Sync all tables (local DB is already filtered, no additional filters needed)
python scripts/sync_to_neon.py

# Clean sync: drop all Neon tables first, then sync fresh
python scripts/sync_to_neon.py --clean

# Dry run (preview what would be synced)
python scripts/sync_to_neon.py --dry-run

# Or from repo root:
make sync-to-neon
```

## Transform Examples

### YoY/MoM Calculations (Polars)

```python
df_transformed = (
    df
    .sort(["region_id", "home_type", "tier", "bedrooms", "date"])
    .with_columns([
        # Previous month value
        pl.col("value")
        .shift(1)
        .over(partition_cols)
        .alias("prev_month_value"),

        # Previous year value (12 months ago)
        pl.col("value")
        .shift(12)
        .over(partition_cols)
        .alias("prev_year_value"),
    ])
    .with_columns([
        # Month-over-month change %
        (
            (pl.col("value") - pl.col("prev_month_value"))
            / pl.col("prev_month_value")
            * 100
        ).round(2).alias("mom_change_pct"),

        # Year-over-year change %
        (
            (pl.col("value") - pl.col("prev_year_value"))
            / pl.col("prev_year_value")
            * 100
        ).round(2).alias("yoy_change_pct"),
    ])
)
```

### Market Classification

```python
# market_summary: based on YoY home value change
pl.when(pl.col("home_value_yoy_pct") > 10)
.then(pl.lit("Hot"))
.when(pl.col("home_value_yoy_pct") >= 3)
.then(pl.lit("Warm"))
.otherwise(pl.lit("Cold"))
.alias("market_classification")

# market_heat_index: based on heat index (0-100 scale)
pl.when(pl.col("heat_index") >= 80).then(pl.lit("Hot"))
.when(pl.col("heat_index") >= 60).then(pl.lit("Warm"))
.when(pl.col("heat_index") >= 40).then(pl.lit("Balanced"))
.when(pl.col("heat_index") >= 20).then(pl.lit("Cool"))
.otherwise(pl.lit("Cold"))
.alias("market_temperature")
```

## Testing

```bash
cd data-platform
make test      # Run all tests
make lint      # Check code style
make typecheck # Run mypy
```

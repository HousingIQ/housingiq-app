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
│           ├── downloader.py
│           ├── transformer.py
│           └── schemas.py
│
├── great_expectations/             # Data quality
│   ├── great_expectations.yml
│   ├── checkpoints/
│   └── expectations/
│
├── data/                           # Local data storage
│   └── processed/                  # Parquet files
│
├── tests/                          # Python tests
├── pyproject.toml                  # Dependencies
├── dagster.yaml                    # Dagster config
└── Makefile                        # Commands
```

## Data Pipeline

```mermaid
graph TD
    subgraph Ingestion
        Z[Zillow CSVs] --> M[zillow_manifest]
        M --> R[zillow_raw_files]
        R --> TZ[zillow_zhvi_transformed]
        R --> TR[zillow_zori_transformed]
    end

    subgraph Transform["Polars Transformations"]
        TZ --> FZ[fct_zhvi_values]
        TR --> FR[fct_zori_values]
        TZ --> DR[dim_regions]
        FZ --> MS[market_summary]
        FR --> MS
        DR --> MS
    end

    subgraph Load["PostgreSQL app.*"]
        DR --> AR[app.regions]
        FZ --> AZ[app.zhvi_values]
        FR --> AO[app.zori_values]
        MS --> AM[app.market_summary]
    end
```

## Asset Groups

### 1. Ingestion (`zillow.py`)

Downloads and transforms Zillow CSV data to Parquet files.

| Asset | Description |
|-------|-------------|
| `zillow_manifest` | Scrapes Zillow data URLs |
| `zillow_raw_files` | Downloads CSV files |
| `zillow_zhvi_transformed` | Transforms ZHVI to Parquet |
| `zillow_zori_transformed` | Transforms ZORI to Parquet |

### 2. Transforms (`transforms.py`)

Polars-based transformations with YoY/MoM calculations.

| Asset | Description |
|-------|-------------|
| `fct_zhvi_values` | ZHVI fact table with change metrics |
| `fct_zori_values` | ZORI fact table with change metrics |
| `dim_regions` | Geographic dimension table |
| `market_summary` | Pre-computed market overview |

### 3. Database Loading (`database.py`)

Loads final tables to PostgreSQL for the webapp.

| Asset | Target Table |
|-------|--------------|
| `app_regions` | `app.regions` |
| `app_zhvi_values` | `app.zhvi_values` |
| `app_zori_values` | `app.zori_values` |
| `app_market_summary` | `app.market_summary` |

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
DATA_DIR=data  # Local data directory
```

## Transform Examples

### YoY/MoM Calculations (Polars)

```python
df_transformed = (
    df
    .sort(["region_id", "date"])
    .with_columns([
        # Previous month value
        pl.col("value")
        .shift(1)
        .over(["region_id"])
        .alias("prev_month_value"),

        # Previous year value (12 months ago)
        pl.col("value")
        .shift(12)
        .over(["region_id"])
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
pl.when(pl.col("home_value_yoy_pct") > 10)
.then(pl.lit("Hot"))
.when(pl.col("home_value_yoy_pct") >= 3)
.then(pl.lit("Warm"))
.otherwise(pl.lit("Cold"))
.alias("market_classification")
```

## Testing

```bash
cd data-platform
make test      # Run all tests
make lint      # Check code style
make typecheck # Run mypy
```

# Data Pipeline

> **Note**: The data pipeline has been fully migrated from the legacy Airflow-based approach to
> **Dagster + Polars + Great Expectations**. For the current architecture, see
> [09-data-platform.md](./09-data-platform.md).

## Current Pipeline Overview

The HousingIQ data pipeline uses Dagster for orchestration and Polars for high-performance data transformations. All pipeline code lives in the `data-platform/` directory.

### Pipeline Stages

```
1. INGESTION (Dagster assets/zillow.py)
   Zillow Research → Scraper discovers URLs → Downloader fetches CSVs → Transformer parses to Parquet

2. TRANSFORMATION (Dagster assets/transforms.py)
   Parquet files → Polars DataFrames → YoY/MoM calculations → Market summary aggregation

3. VALIDATION (Great Expectations)
   Schema checks → Value range validation → Completeness tests

4. DATABASE LOADING (Dagster assets/database.py)
   Mart Parquet → Popular regions filter → ADBC bulk insert → PostgreSQL app.* tables
```

### Data Layers

The pipeline uses a three-layer architecture:

| Layer | Path | Description |
|-------|------|-------------|
| **Raw** | `data/raw/` | Downloaded Zillow CSV files (organized by category) |
| **Staging** | `data/staging/` | Normalized Parquet files (regions, values in long format) |
| **Mart** | `data/mart/` | Final transformed Parquet (with YoY/MoM, market summary) |

### Running the Pipeline

```bash
# Start Dagster UI
make dagster  # Opens http://localhost:3001

# Materialize all assets
make materialize

# Or from data-platform/
cd data-platform
dagster asset materialize --select "*" -m housingiq_dagster.definitions
```

### Key Technologies

| Component | Purpose |
|-----------|---------|
| **Dagster** | Asset-based orchestration with automatic lineage |
| **Polars** | High-performance DataFrame operations (10-100x faster than Pandas) |
| **Great Expectations** | Data quality validation |
| **ADBC** | Fast bulk insert to PostgreSQL via Apache Arrow |

### Popular Regions Filter

To keep the database manageable for Neon free tier (~167 MB), the pipeline applies a filter:
- All 51 States
- Top 100 Metros (by size_rank)
- Top 100 Counties (by size_rank)
- Top 200 Cities (by size_rank)

This yields ~450 regions with full historical data (1996-present).

### Production Sync

```bash
# Sync app.* tables from local PostgreSQL to Neon (production)
make sync-to-neon
```

For full details, see [09-data-platform.md](./09-data-platform.md).

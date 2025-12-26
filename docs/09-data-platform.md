# Data Platform Architecture

## Overview

HousingIQ's data platform is a **portfolio-grade**, local-first data engineering system showcasing industry-standard tools and patterns:

| Capability | Tool | Why It Matters |
|------------|------|----------------|
| **Orchestration** | Dagster | Software-defined assets, automatic lineage |
| **Transformations** | dbt | Industry standard, contracts, testing |
| **Data Quality** | Great Expectations | Validation suites, data docs |
| **Processing** | Polars | Fast DataFrame operations |
| **Storage** | PostgreSQL + DuckDB | OLTP + analytical queries |

### Key Patterns Demonstrated

- ELT with staging → intermediate → marts layers
- Incremental loading with merge strategy
- Data contracts for schema enforcement
- SCD Type 2 ready dimension tables
- Data quality gates before load
- Idempotent, replayable pipelines
- Observable with built-in lineage

## Repository Structure

```
housingiq-app/
├── docker-compose.yml              # Shared infrastructure (PostgreSQL)
├── .env.example                    # Environment template
├── Makefile                        # Developer commands
│
├── data-platform/                  # Data engineering
│   ├── pyproject.toml
│   ├── Makefile
│   │
│   ├── dagster/                    # Orchestration
│   │   ├── definitions.py          # Entry point
│   │   ├── assets/
│   │   │   ├── ingestion.py        # Raw data extraction
│   │   │   └── dbt.py              # dbt integration
│   │   ├── resources/
│   │   │   └── database.py
│   │   └── sensors/
│   │       └── file_sensor.py      # Trigger on new data
│   │
│   ├── dbt/                        # Transformations
│   │   ├── dbt_project.yml
│   │   ├── profiles.yml            # Local postgres connection
│   │   ├── packages.yml            # dbt packages
│   │   ├── models/
│   │   │   ├── staging/            # Raw → cleaned
│   │   │   │   ├── _staging.yml
│   │   │   │   ├── stg_zillow__regions.sql
│   │   │   │   └── stg_zillow__zhvi.sql
│   │   │   ├── intermediate/       # Business logic
│   │   │   │   └── int_regions_enriched.sql
│   │   │   └── marts/              # Final tables
│   │   │       ├── _marts.yml      # Contracts + tests
│   │   │       ├── dim_regions.sql
│   │   │       └── fct_zhvi_values.sql
│   │   ├── macros/
│   │   │   └── normalize_geography.sql
│   │   ├── seeds/
│   │   │   └── state_codes.csv
│   │   └── tests/
│   │       └── assert_zhvi_positive.sql
│   │
│   ├── great_expectations/         # Data quality
│   │   ├── gx.yml
│   │   ├── expectations/
│   │   │   └── zillow_regions_suite.json
│   │   └── checkpoints/
│   │       └── zillow_checkpoint.yml
│   │
│   ├── ingestion/                  # Python extraction
│   │   ├── __init__.py
│   │   ├── sources/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   └── zillow.py
│   │   └── loaders/
│   │       ├── __init__.py
│   │       └── postgres.py
│   │
│   └── data/                       # Local data lake
│       ├── raw/                    # Landing zone
│       │   └── zillow/
│       └── staging/                # Intermediate files
│
├── webapp/                         # Next.js application
│   └── src/lib/db/
│       └── schema.ts               # Reads from mart tables
│
└── docs/
    └── *.md
```

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Sources["Data Sources"]
        Z[Zillow Research API]
        R[Redfin - Future]
        C[Census - Future]
    end

    subgraph Orchestration["Dagster (localhost:3000)"]
        ASSETS[Software-Defined Assets]
        SENSORS[File Sensors]
        SCHEDULE[Schedules]
    end

    subgraph Ingestion["Python Ingestion"]
        DL[Download Raw Files]
        VAL[Great Expectations]
    end

    subgraph Transform["dbt Transformations"]
        STG[staging/]
        INT[intermediate/]
        MART[marts/]
    end

    subgraph Storage["Storage Layer"]
        subgraph Local["Local Files"]
            RAW[data/raw/]
            PARQUET[data/staging/]
        end

        subgraph Database["PostgreSQL (localhost:5432)"]
            RAW_SCHEMA[raw schema]
            ANALYTICS[analytics schema]
        end
    end

    subgraph Webapp["Next.js Webapp"]
        API[API Routes]
        UI[Dashboard UI]
    end

    Z --> DL
    DL --> RAW
    RAW --> VAL
    VAL --> RAW_SCHEMA

    ASSETS --> DL
    ASSETS --> Transform
    SENSORS --> ASSETS

    RAW_SCHEMA --> STG
    STG --> INT
    INT --> MART
    MART --> ANALYTICS

    ANALYTICS --> API
    API --> UI
```

## Shared Infrastructure

### Root docker-compose.yml

PostgreSQL is shared between the webapp and data platform, so `docker-compose.yml` lives at the repository root:

```yaml
# housingiq-app/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: housingiq-db
    environment:
      POSTGRES_USER: housingiq
      POSTGRES_PASSWORD: housingiq
      POSTGRES_DB: housingiq
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U housingiq"]
      interval: 5s
      timeout: 3s
      retries: 5

  pgweb:
    image: sosedoff/pgweb
    container_name: housingiq-pgweb
    ports:
      - "8081:8081"
    environment:
      DATABASE_URL: postgres://housingiq:housingiq@postgres:5432/housingiq?sslmode=disable
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

### Database Schema Initialization

```sql
-- init-db/01-schemas.sql
CREATE SCHEMA IF NOT EXISTS raw;        -- Landing zone for ingestion
CREATE SCHEMA IF NOT EXISTS analytics;  -- dbt mart tables
CREATE SCHEMA IF NOT EXISTS app;        -- Webapp tables (users)

GRANT ALL ON SCHEMA raw, analytics, app TO housingiq;
```

### Root Makefile

```makefile
# housingiq-app/Makefile
.PHONY: up down logs

# Start all infrastructure
up:
	docker compose up -d
	@echo ""
	@echo "Services running:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  pgweb:      http://localhost:8081"

# Stop all infrastructure
down:
	docker compose down

# View logs
logs:
	docker compose logs -f
```

## Data Platform Components

### 1. Dagster Orchestration

Dagster provides software-defined assets with automatic lineage tracking.

```python
# data-platform/dagster/definitions.py
from pathlib import Path
from dagster import Definitions
from dagster_dbt import DbtCliResource, DbtProject
from dagster_postgres import PostgresResource

from .assets.ingestion import raw_zillow_regions, raw_zillow_zhvi
from .assets.dbt import all_dbt_assets

DBT_PROJECT_DIR = Path(__file__).parent.parent / "dbt"
dbt_project = DbtProject(project_dir=DBT_PROJECT_DIR)

defs = Definitions(
    assets=[
        raw_zillow_regions,
        raw_zillow_zhvi,
        all_dbt_assets,
    ],
    resources={
        "dbt": DbtCliResource(project_dir=DBT_PROJECT_DIR),
        "postgres": PostgresResource(
            host="localhost",
            port=5432,
            user="housingiq",
            password="housingiq",
            database="housingiq",
        ),
    },
)
```

```python
# data-platform/dagster/assets/ingestion.py
from dagster import asset, MaterializeResult, AssetExecutionContext
from pathlib import Path
import polars as pl
import httpx


@asset(
    group_name="ingestion",
    kinds={"python", "zillow"},
    description="Download Zillow ZHVI metro data from public API"
)
def raw_zillow_zhvi(context: AssetExecutionContext) -> MaterializeResult:
    """Ingest raw Zillow ZHVI data into landing zone."""
    url = "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"

    out_path = Path("data/raw/zillow/zhvi_metro.csv")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Download
    response = httpx.get(url, follow_redirects=True, timeout=60)
    response.raise_for_status()
    out_path.write_bytes(response.content)

    # Get metadata
    df = pl.read_csv(out_path)

    context.log.info(f"Downloaded {len(df)} rows, {len(df.columns)} columns")

    return MaterializeResult(
        metadata={
            "row_count": len(df),
            "column_count": len(df.columns),
            "file_path": str(out_path),
            "file_size_mb": round(out_path.stat().st_size / 1024 / 1024, 2),
            "source_url": url,
        }
    )


@asset(
    group_name="ingestion",
    kinds={"python", "zillow"},
)
def raw_zillow_regions(context: AssetExecutionContext) -> MaterializeResult:
    """Extract unique regions from ZHVI data."""
    # Similar implementation...
    pass
```

```python
# data-platform/dagster/assets/dbt.py
from dagster import AssetExecutionContext
from dagster_dbt import DbtCliResource, dbt_assets

from ..definitions import dbt_project


@dbt_assets(manifest=dbt_project.manifest_path)
def all_dbt_assets(context: AssetExecutionContext, dbt: DbtCliResource):
    """Run all dbt models with automatic lineage."""
    yield from dbt.cli(["build"], context=context).stream()
```

### 2. dbt Transformations

dbt handles all SQL transformations with contracts, tests, and documentation.

#### Project Configuration

```yaml
# data-platform/dbt/dbt_project.yml
name: housingiq
version: '1.0.0'

profile: housingiq

model-paths: ["models"]
seed-paths: ["seeds"]
test-paths: ["tests"]
macro-paths: ["macros"]

models:
  housingiq:
    staging:
      +materialized: view
      +schema: staging
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table
      +schema: analytics
      +contract:
        enforced: true
```

```yaml
# data-platform/dbt/profiles.yml
housingiq:
  target: dev
  outputs:
    dev:
      type: postgres
      host: localhost
      port: 5432
      user: housingiq
      password: housingiq
      dbname: housingiq
      schema: public
      threads: 4
```

#### Staging Models

```sql
-- data-platform/dbt/models/staging/stg_zillow__regions.sql
with source as (
    select * from {{ source('zillow', 'raw_regions') }}
),

renamed as (
    select
        cast(region_id as varchar(100)) as region_id,
        region_id_original::integer as region_id_original,
        trim(region_name) as region_name,
        nullif(trim(state), '') as state,
        nullif(trim(state_name), '') as state_name,
        nullif(trim(city), '') as city,
        nullif(trim(county), '') as county,
        nullif(trim(metro), '') as metro,
        {{ normalize_geography_level('geography_level') }} as geography_level,
        nullif(trim(region_type), '') as region_type,
        size_rank::integer as size_rank,
        state_code_fips::integer as state_code_fips,
        municipal_code_fips::integer as municipal_code_fips,
        current_timestamp as _loaded_at
    from source
)

select * from renamed
```

```sql
-- data-platform/dbt/models/staging/stg_zillow__zhvi.sql
with source as (
    select * from {{ source('zillow', 'raw_zhvi') }}
),

unpivoted as (
    -- Zillow data is wide format, unpivot to long
    {{ dbt_utils.unpivot(
        relation=source,
        cast_to='numeric',
        exclude=['RegionID', 'SizeRank', 'RegionName', 'RegionType', 'StateName'],
        field_name='date_str',
        value_name='value'
    ) }}
),

cleaned as (
    select
        cast("RegionID" as varchar(100)) as region_id,
        cast(date_str as date) as date,
        value::real as value,
        'Metro' as geography_level,
        'AllHomes' as home_type,
        null as tier,
        null as bedrooms,
        true as smoothed,
        true as seasonally_adjusted,
        'monthly' as frequency,
        current_timestamp as _loaded_at
    from unpivoted
    where value is not null
)

select * from cleaned
```

#### Mart Models with Contracts

```yaml
# data-platform/dbt/models/marts/_marts.yml
version: 2

models:
  - name: dim_regions
    description: "Region dimension table with geographic hierarchy"
    config:
      contract:
        enforced: true
    columns:
      - name: region_sk
        data_type: varchar(64)
        description: "Surrogate key (SHA256 hash)"
        constraints:
          - type: not_null
          - type: primary_key
      - name: region_id
        data_type: varchar(100)
        description: "Natural key from source"
        constraints:
          - type: not_null
          - type: unique
        tests:
          - unique
          - not_null
      - name: region_name
        data_type: varchar(255)
        constraints:
          - type: not_null
      - name: state
        data_type: varchar(2)
      - name: geography_level
        data_type: varchar(50)
        constraints:
          - type: not_null
        tests:
          - accepted_values:
              values: ['State', 'Metro', 'City', 'County', 'Zip']
      - name: is_current
        data_type: boolean
        constraints:
          - type: not_null

  - name: fct_zhvi_values
    description: "ZHVI fact table with home values over time"
    config:
      contract:
        enforced: true
    columns:
      - name: zhvi_sk
        data_type: varchar(64)
        constraints:
          - type: not_null
          - type: primary_key
      - name: region_id
        data_type: varchar(100)
        constraints:
          - type: not_null
        tests:
          - relationships:
              to: ref('dim_regions')
              field: region_id
      - name: date
        data_type: date
        constraints:
          - type: not_null
      - name: value
        data_type: real
        tests:
          - dbt_utils.expression_is_true:
              expression: ">= 0"
              config:
                where: "value is not null"
```

```sql
-- data-platform/dbt/models/marts/dim_regions.sql
{{
    config(
        materialized='table',
        contract={'enforced': true}
    )
}}

select
    {{ dbt_utils.generate_surrogate_key(['region_id']) }} as region_sk,
    region_id,
    region_name,
    state,
    state_name,
    city,
    county,
    metro,
    geography_level,
    region_type,
    size_rank,
    state_code_fips,
    municipal_code_fips,
    current_timestamp as valid_from,
    null::timestamp as valid_to,
    true as is_current,
    _loaded_at
from {{ ref('stg_zillow__regions') }}
```

```sql
-- data-platform/dbt/models/marts/fct_zhvi_values.sql
{{
    config(
        materialized='incremental',
        unique_key=['region_id', 'date', 'home_type'],
        incremental_strategy='merge',
        contract={'enforced': true}
    )
}}

select
    {{ dbt_utils.generate_surrogate_key(['region_id', 'date', 'home_type']) }} as zhvi_sk,
    region_id,
    date,
    value,
    geography_level,
    home_type,
    tier,
    bedrooms,
    smoothed,
    seasonally_adjusted,
    frequency,
    _loaded_at
from {{ ref('stg_zillow__zhvi') }}

{% if is_incremental() %}
where _loaded_at > (select max(_loaded_at) from {{ this }})
{% endif %}
```

#### Custom Macros

```sql
-- data-platform/dbt/macros/normalize_geography.sql
{% macro normalize_geography_level(column_name) %}
    case
        when lower({{ column_name }}) in ('state', 'states') then 'State'
        when lower({{ column_name }}) in ('metro', 'msa', 'cbsa') then 'Metro'
        when lower({{ column_name }}) in ('city', 'cities', 'place') then 'City'
        when lower({{ column_name }}) in ('county', 'counties') then 'County'
        when lower({{ column_name }}) in ('zip', 'zipcode', 'zip code') then 'Zip'
        else initcap({{ column_name }})
    end
{% endmacro %}
```

### 3. Great Expectations Data Quality

```yaml
# data-platform/great_expectations/gx.yml
config_version: 3.0

stores:
  expectations_store:
    class_name: ExpectationsStore
    store_backend:
      class_name: TupleFilesystemStoreBackend
      base_directory: great_expectations/expectations/

  validations_store:
    class_name: ValidationsStore
    store_backend:
      class_name: TupleFilesystemStoreBackend
      base_directory: great_expectations/validations/

data_docs_sites:
  local_site:
    class_name: SiteBuilder
    store_backend:
      class_name: TupleFilesystemStoreBackend
      base_directory: great_expectations/data_docs/
```

```python
# Example: Creating expectation suite
from great_expectations.core import ExpectationSuite, ExpectationConfiguration

suite = ExpectationSuite(name="zillow_regions")

suite.add_expectation(
    ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_unique",
        kwargs={"column": "region_id"}
    )
)

suite.add_expectation(
    ExpectationConfiguration(
        expectation_type="expect_column_values_to_not_be_null",
        kwargs={"column": "region_name"}
    )
)

suite.add_expectation(
    ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_in_set",
        kwargs={
            "column": "geography_level",
            "value_set": ["State", "Metro", "City", "County", "Zip"]
        }
    )
)

suite.add_expectation(
    ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_between",
        kwargs={
            "column": "size_rank",
            "min_value": 1,
            "max_value": 1000,
            "mostly": 0.95
        }
    )
)
```

## Data Model

### Star Schema Design

```
                    ┌─────────────────┐
                    │   dim_regions   │
                    │─────────────────│
                    │ region_sk (PK)  │
                    │ region_id (NK)  │
                    │ region_name     │
                    │ state           │
                    │ state_name      │
                    │ city            │
                    │ county          │
                    │ metro           │
                    │ geography_level │
                    │ size_rank       │
                    │ is_current      │◄──┐
                    │ valid_from      │   │
                    │ valid_to        │   │
                    └─────────────────┘   │
                                          │
┌─────────────────┐   ┌─────────────────┐ │
│    dim_date     │   │ fct_zhvi_values │ │
│─────────────────│   │─────────────────│ │
│ date_key (PK)   │◄──│ date            │ │
│ date            │   │ region_id (FK)  │─┘
│ year            │   │ zhvi_sk (PK)    │
│ quarter         │   │ value           │
│ month           │   │ home_type       │
│ month_name      │   │ tier            │
│ day_of_week     │   │ bedrooms        │
│ is_weekend      │   │ smoothed        │
│ is_month_end    │   │ frequency       │
└─────────────────┘   └─────────────────┘
```

### Schema Synchronization Strategy

dbt contracts serve as the source of truth. The webapp reads from mart tables:

```
┌─────────────────────────────────────────────────────────────────┐
│  dbt/models/marts/_marts.yml   ← SOURCE OF TRUTH (contracts)   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ dbt build --fail-fast
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL analytics schema (dim_regions, fct_zhvi_values)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ webapp reads these tables
┌─────────────────────────────────────────────────────────────────┐
│  webapp/src/lib/db/schema.ts  (Drizzle types for mart tables)  │
└─────────────────────────────────────────────────────────────────┘
```

If dbt contracts change, the build fails until models are updated. The webapp uses the guaranteed schema from the analytics tables.

## Development Workflow

### Quick Start

```bash
# 1. Start shared infrastructure (from repo root)
cd housingiq-app
make up

# 2. Set up data platform
cd data-platform
pip install -e ".[dev]"
cd dbt && dbt deps && cd ..

# 3. Run the full pipeline via Dagster UI
dagster dev
# Opens http://localhost:3000
# Click "Materialize all"

# 4. Or run via CLI
dbt build                    # Run dbt only
dagster job execute -j all   # Run full pipeline
```

### Local Services

| Service | URL | Purpose |
|---------|-----|---------|
| Dagster UI | http://localhost:3000 | Orchestration, lineage |
| dbt docs | http://localhost:8080 | Data catalog |
| pgweb | http://localhost:8081 | Database browser |
| PostgreSQL | localhost:5432 | Database |

### Data Platform Makefile

```makefile
# data-platform/Makefile
.PHONY: setup dagster dbt-run dbt-test dbt-docs gx test clean

# First time setup
setup:
	pip install -e ".[dev]"
	cd dbt && dbt deps

# Run Dagster UI
dagster:
	dagster dev

# dbt commands
dbt-run:
	cd dbt && dbt run

dbt-test:
	cd dbt && dbt test

dbt-docs:
	cd dbt && dbt docs generate && dbt docs serve --port 8080

dbt-build:
	cd dbt && dbt build

# Great Expectations
gx:
	great_expectations checkpoint run zillow_checkpoint

gx-docs:
	great_expectations docs build

# Run all tests
test:
	pytest tests/ -v
	cd dbt && dbt test

# Clean local data
clean:
	rm -rf data/raw/* data/staging/*
```

## Python Dependencies

```toml
# data-platform/pyproject.toml
[project]
name = "housingiq-data-platform"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    # Orchestration
    "dagster>=1.7",
    "dagster-webserver>=1.7",
    "dagster-postgres>=0.23",
    "dagster-dbt>=0.23",

    # Transformations
    "dbt-core>=1.8",
    "dbt-postgres>=1.8",

    # Data Quality
    "great-expectations>=0.18",

    # Processing
    "polars>=1.0",
    "duckdb>=1.0",

    # Utilities
    "httpx>=0.27",
    "python-dotenv>=1.0",
    "typer>=0.12",
    "rich>=13.0",
    "sqlalchemy>=2.0",
    "psycopg2-binary>=2.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=5.0",
    "ruff>=0.5",
    "mypy>=1.10",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]
```

## Existing Data Sources

### Zillow (Primary)

The Zillow data source provides 150+ datasets including:
- **ZHVI** - Zillow Home Value Index
- **ZORI** - Zillow Observed Rent Index
- **Inventory, Listings, Sales** - Market activity data

See [10-zillow-data-source.md](./10-zillow-data-source.md) for full documentation including:
- Scraper, downloader, and ETL code
- Data schema and categories
- Migration plan to Dagster

**Current Location:** `zillow_data_sc/` (sibling to `housingiq-app/`)

**Target Location:** `data-platform/ingestion/sources/zillow/`

### Future Sources

| Source | Data | Status |
|--------|------|--------|
| Redfin | Market tracker, sales data | Planned |
| Census | Demographics, population | Planned |
| BLS | Employment, wages | Planned |

---

## Adding a New Data Source

### Step 1: Create Dagster Asset

```python
# data-platform/dagster/assets/ingestion.py
@asset(
    group_name="ingestion",
    kinds={"python", "redfin"},
    description="Download Redfin market tracker data"
)
def raw_redfin_market(context: AssetExecutionContext) -> MaterializeResult:
    url = "https://redfin-public-data.s3.amazonaws.com/..."
    out_path = Path("data/raw/redfin/market_tracker.csv")

    # Download and return metadata
    ...
```

### Step 2: Add dbt Source

```yaml
# data-platform/dbt/models/staging/_sources.yml
sources:
  - name: redfin
    schema: raw
    tables:
      - name: raw_market_tracker
        description: "Redfin weekly market data"
```

### Step 3: Create Staging Model

```sql
-- data-platform/dbt/models/staging/stg_redfin__market.sql
with source as (
    select * from {{ source('redfin', 'raw_market_tracker') }}
),

cleaned as (
    select
        region_id,
        period_end::date as date,
        median_sale_price::numeric as median_sale_price,
        homes_sold::integer as homes_sold,
        inventory::integer as inventory,
        current_timestamp as _loaded_at
    from source
)

select * from cleaned
```

### Step 4: Add to Mart

```sql
-- data-platform/dbt/models/marts/fct_market_metrics.sql
{{
    config(
        materialized='incremental',
        unique_key=['region_id', 'date', 'source'],
        contract={'enforced': true}
    )
}}

-- Union Zillow and Redfin data
select
    region_id,
    date,
    'zillow' as source,
    value as zhvi,
    null as median_sale_price,
    null as homes_sold
from {{ ref('stg_zillow__zhvi') }}

union all

select
    region_id,
    date,
    'redfin' as source,
    null as zhvi,
    median_sale_price,
    homes_sold
from {{ ref('stg_redfin__market') }}
```

### Step 5: Verify in Dagster UI

The new asset appears automatically in the lineage graph:

```
[raw_redfin_market] → [stg_redfin__market] → [fct_market_metrics]
                                                      ↑
[raw_zillow_zhvi] → [stg_zillow__zhvi] ──────────────┘
```

## Observability

### Dagster Asset Lineage

Dagster automatically tracks:
- Asset dependencies
- Materialization history
- Metadata (row counts, file sizes)
- Run logs

### dbt Documentation

```bash
cd data-platform
make dbt-docs
# Opens http://localhost:8080 with:
# - Column-level lineage
# - Test results
# - Model documentation
# - Data dictionary
```

### Great Expectations Data Docs

```bash
make gx-docs
# Generates HTML report with:
# - Expectation results
# - Data quality trends
# - Validation history
```

## Best Practices Applied

| Principle | Implementation |
|-----------|----------------|
| **Idempotency** | dbt incremental + merge strategy |
| **Schema contracts** | dbt contracts with enforced: true |
| **Testing** | dbt tests + Great Expectations suites |
| **Lineage** | Dagster auto-lineage + dbt docs |
| **Incremental loads** | `is_incremental()` macro |
| **Data quality** | Pre-load validation with GX |
| **Modularity** | Staging → Intermediate → Marts |
| **Documentation** | Auto-generated from dbt + GX |

## Migration from Legacy Pipeline

See [06-data-pipeline.md](./06-data-pipeline.md) for the legacy Airflow setup.

Migration steps:
1. Keep old `data-pipeline/` until new platform is validated
2. Run both in parallel with separate schemas
3. Compare outputs for consistency
4. Switch webapp to read from new `analytics` schema
5. Archive `data-pipeline/` directory

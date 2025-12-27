# HousingIQ Data Platform

Data engineering platform for HousingIQ using Dagster, dbt, and Great Expectations.

## Prerequisites

- Python 3.11+
- PostgreSQL (via Docker: `make up` from root)

## Setup

```bash
make setup    # Install dependencies + dbt packages
```
image.png

## Project Structure

```
data-platform/
├── housingiq_dagster/   # Dagster assets, schedules, sensors
├── ingestion/           # Data ingestion modules
├── dbt/                 # dbt models and tests
├── great_expectations/  # Data validation
└── tests/               # Python tests
```

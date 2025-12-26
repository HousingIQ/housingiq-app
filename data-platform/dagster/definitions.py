"""
Dagster definitions for HousingIQ data platform.

This is the main entry point for Dagster. Run with:
    dagster dev -m dagster.definitions
"""

from pathlib import Path

from dagster import Definitions, EnvVar
from dagster_dbt import DbtCliResource, DbtProject

# Import assets (will be implemented in Phase 3-4)
# from .assets import (
#     raw_zillow_manifest,
#     raw_zillow_zhvi,
#     raw_zillow_regions,
#     stg_zillow_regions,
#     stg_zillow_zhvi,
#     all_dbt_assets,
# )
# from .resources import postgres_resource

# dbt project configuration
DBT_PROJECT_DIR = Path(__file__).parent.parent / "dbt"

# Placeholder definitions - will be populated in Phase 3-4
defs = Definitions(
    assets=[],
    resources={
        "dbt": DbtCliResource(project_dir=DBT_PROJECT_DIR),
    },
)

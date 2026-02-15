"""
Dagster Assets Package.

Software-defined assets for the HousingIQ data platform.
All transformations are done with Polars for high performance.
"""

from .database import (
    app_affordability_metrics,
    app_inventory_values,
    app_market_heat_index,
    app_market_summary,
    app_regions,
    app_zhvi_values,
    app_zori_values,
)
from .transforms import (
    aggregate_market_summary,
    dimension_regions,
    fact_affordability_metrics,
    fact_inventory_values,
    fact_market_heat_index,
    fact_zhvi_values,
    fact_zori_values,
)
from .zillow import (
    zillow_manifest,
    zillow_raw_files,
    zillow_zhvi_transformed,
    zillow_zori_transformed,
)

__all__ = [
    # Zillow ingestion assets
    "zillow_manifest",
    "zillow_raw_files",
    "zillow_zhvi_transformed",
    "zillow_zori_transformed",
    # Polars transformation assets
    "fact_zhvi_values",
    "fact_zori_values",
    "fact_inventory_values",
    "fact_market_heat_index",
    "fact_affordability_metrics",
    "dimension_regions",
    "aggregate_market_summary",
    # App database loading assets
    "app_regions",
    "app_zhvi_values",
    "app_zori_values",
    "app_inventory_values",
    "app_market_heat_index",
    "app_affordability_metrics",
    "app_market_summary",
]

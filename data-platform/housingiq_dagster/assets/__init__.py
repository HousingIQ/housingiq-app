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
    dim_regions,
    fct_affordability_metrics,
    fct_inventory_values,
    fct_market_heat_index,
    fct_zhvi_values,
    fct_zori_values,
    market_summary,
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
    "fct_zhvi_values",
    "fct_zori_values",
    "fct_inventory_values",
    "fct_market_heat_index",
    "fct_affordability_metrics",
    "dim_regions",
    "market_summary",
    # App database loading assets
    "app_regions",
    "app_zhvi_values",
    "app_zori_values",
    "app_inventory_values",
    "app_market_heat_index",
    "app_affordability_metrics",
    "app_market_summary",
]

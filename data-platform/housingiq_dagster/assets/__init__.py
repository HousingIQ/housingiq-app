"""
Dagster Assets Package.

Software-defined assets for the HousingIQ data platform.
All transformations are done with Polars for high performance.
"""

from .database import (
    app_market_summary,
    app_regions,
    app_zhvi_values,
)
from .fhfa import (
    app_fhfa_hpi,
    fhfa_hpi_transformed,
    fhfa_raw_file,
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
    # FHFA ingestion assets
    "fhfa_raw_file",
    "fhfa_hpi_transformed",
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
    "app_market_summary",
    "app_fhfa_hpi",
]

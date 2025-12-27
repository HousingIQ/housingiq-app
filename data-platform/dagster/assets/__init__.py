"""
Dagster Assets Package.

Software-defined assets for the HousingIQ data platform.
"""

from .database import raw_zhvi_regions, raw_zhvi_values, raw_zori_values
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
    # Database loading assets
    "raw_zhvi_regions",
    "raw_zhvi_values",
    "raw_zori_values",
]

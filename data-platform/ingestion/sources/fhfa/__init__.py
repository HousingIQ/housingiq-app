"""
FHFA HPI Data Source - Ingestion module for FHFA House Price Index data.

This module provides tools to:
- Download the HPI master CSV from FHFA
- Transform raw data to normalized Parquet format using Polars

The FHFA HPI provides long-term house price appreciation data back to 1975,
covering USA-level, state-level, and MSA-level geographies.
"""

from .config import DOWNLOAD_SETTINGS, MASTER_CSV_URL
from .downloader import FHFADownloader, download_fhfa_data
from .transformer import FHFATransformer, transform_fhfa_data

__all__ = [
    "MASTER_CSV_URL",
    "DOWNLOAD_SETTINGS",
    "FHFADownloader",
    "download_fhfa_data",
    "FHFATransformer",
    "transform_fhfa_data",
]

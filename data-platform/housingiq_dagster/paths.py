"""
Centralized Data Paths.

Single source of truth for all data directory paths in the data platform.
Uses the medallion pattern: raw -> staging -> mart.
"""

from pathlib import Path

# Base data directory
DATA_DIR = Path("data")

# Bronze: Raw downloaded files (CSVs, manifests, logs)
RAW_DIR = DATA_DIR / "raw"

# Silver: Normalized/cleaned intermediate Parquet files
STAGING_DIR = DATA_DIR / "staging"

# Gold: Final transformed Parquet files, ready for DB loading
MART_DIR = DATA_DIR / "mart"

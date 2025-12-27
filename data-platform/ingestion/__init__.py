"""
Data Ingestion Module.

This module contains data source implementations for ingesting
external data into the HousingIQ data platform.
"""

from .sources.zillow import ZillowSource

__all__ = ["ZillowSource"]

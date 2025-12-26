"""HousingIQ data ingestion package."""

from .sources.zillow import ZillowSource

__all__ = ["ZillowSource"]

"""
Pydantic schemas for Zillow data validation.

These schemas define the structure of data at various stages
of the ingestion pipeline.
"""

from __future__ import annotations

from datetime import date as DateType
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# =============================================================================
# Link/Manifest Schemas
# =============================================================================


class LinkInfo(BaseModel):
    """Information about a single download link."""

    url: str
    category: str
    filename: str
    geography: str
    description: str
    pattern_name: str
    url_hash: str


class DownloadManifest(BaseModel):
    """Manifest containing all download links."""

    total_links: int
    total_categories: int
    categories: list[str]
    links_by_category: dict[str, list[LinkInfo]]
    all_links: list[LinkInfo]


# =============================================================================
# Region Schemas
# =============================================================================


GeographyLevel = Literal[
    "National",
    "State",
    "Metro",
    "County",
    "City",
    "Zip",
    "Neighborhood",
]


class Region(BaseModel):
    """Normalized region dimension."""

    region_id: str = Field(description="Unique region identifier")
    region_id_original: str | None = Field(default=None, description="Original Zillow RegionID")
    region_name: str = Field(description="Region name")
    geography_level: GeographyLevel = Field(description="Geographic level")
    state_code: str | None = Field(default=None, description="Two-letter state code")
    state_name: str | None = Field(default=None, description="Full state name")
    city: str | None = Field(default=None, description="City name")
    county_name: str | None = Field(default=None, description="County name")
    metro: str | None = Field(default=None, description="Metro area name")
    size_rank: int | None = Field(default=None, description="Population rank")


# =============================================================================
# Value Schemas
# =============================================================================


HomeType = Literal[
    "All Homes",
    "Single Family",
    "Condo",
    "Multi Family",
    "All Homes Plus Multifamily",
    "Unknown",
]

ValueTier = Literal[
    "All",
    "Top-Tier",
    "Mid-Tier",
    "Bottom-Tier",
]

Frequency = Literal["monthly", "weekly"]


class ZHVIValue(BaseModel):
    """Single ZHVI (Zillow Home Value Index) observation."""

    region_id: str = Field(description="Reference to region")
    date: DateType = Field(description="Observation date")
    value: float = Field(description="Home value in USD")
    geography_level: GeographyLevel
    home_type: HomeType
    tier: ValueTier
    smoothed: bool = Field(default=True)
    seasonally_adjusted: bool = Field(default=True)
    frequency: Frequency = Field(default="monthly")
    bedrooms: int | None = Field(default=None, description="Bedroom count filter")


class ZORIValue(BaseModel):
    """Single ZORI (Zillow Observed Rent Index) observation."""

    region_id: str = Field(description="Reference to region")
    date: DateType = Field(description="Observation date")
    value: float = Field(description="Rent value in USD")
    geography_level: GeographyLevel
    home_type: HomeType
    smoothed: bool = Field(default=True)
    seasonally_adjusted: bool = Field(default=True)
    frequency: Frequency = Field(default="monthly")


# =============================================================================
# Raw Data Schemas (for PostgreSQL raw schema)
# =============================================================================


class RawZillowRecord(BaseModel):
    """Record for raw.zillow_* tables."""

    # Source tracking
    source_file: str = Field(description="Original filename")
    extracted_at: datetime = Field(default_factory=datetime.utcnow)

    # Region fields (nullable - varies by file)
    region_id: str | None = None
    region_name: str | None = None
    state: str | None = None
    state_name: str | None = None
    city: str | None = None
    metro: str | None = None
    county_name: str | None = None
    size_rank: int | None = None

    # Value fields
    date: DateType
    value: float | None = None

    # Metadata from filename
    geography_level: str
    home_type: str
    tier: str
    smoothed: bool
    seasonally_adjusted: bool
    frequency: str
    bedrooms: int | None = None


# =============================================================================
# Download/Processing Status Schemas
# =============================================================================


DownloadStatus = Literal["success", "failed", "skipped"]


class DownloadResult(BaseModel):
    """Result of a single file download."""

    filename: str
    category: str
    status: DownloadStatus
    path: str | None = None
    error: str | None = None


class DownloadStats(BaseModel):
    """Aggregate download statistics."""

    total: int = 0
    success: int = 0
    failed: int = 0
    skipped: int = 0


class ProcessingResult(BaseModel):
    """Result of processing a category."""

    category: str
    files_processed: int
    regions_count: int
    values_count: int
    errors: list[str] = Field(default_factory=list)
    duration_seconds: float = 0.0

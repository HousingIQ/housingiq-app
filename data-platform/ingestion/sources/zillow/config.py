"""
Zillow data source configuration.

Contains URL patterns, category definitions, and default settings.
"""

from typing import TypedDict


class DatasetInfo(TypedDict):
    """Metadata about a Zillow dataset."""
    category: str
    template: str
    geographies: list[str]
    description: str


# Base URL for Zillow research data
BASE_CDN_URL = "https://files.zillowstatic.com/research/public_csvs"

# URL patterns for different data types
URL_PATTERNS: dict[str, DatasetInfo] = {
    # HOME VALUES - ZHVI
    "zhvi_all_sm_sa": {
        "category": "zhvi",
        "template": "{geo}_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip", "Neighborhood"],
        "description": "ZHVI All Homes (SFR, Condo/Co-op) Smoothed, Seasonally Adjusted",
    },
    "zhvi_all_raw": {
        "category": "zhvi",
        "template": "{geo}_zhvi_uc_sfrcondo_tier_0.33_0.67_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip", "Neighborhood"],
        "description": "ZHVI All Homes Raw, Mid-Tier",
    },
    "zhvi_top_tier": {
        "category": "zhvi",
        "template": "{geo}_zhvi_uc_sfrcondo_tier_0.67_1.0_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip", "Neighborhood"],
        "description": "ZHVI All Homes - Top Tier",
    },
    "zhvi_bottom_tier": {
        "category": "zhvi",
        "template": "{geo}_zhvi_uc_sfrcondo_tier_0.0_0.33_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip", "Neighborhood"],
        "description": "ZHVI All Homes - Bottom Tier",
    },
    "zhvi_sfr": {
        "category": "zhvi",
        "template": "{geo}_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip", "Neighborhood"],
        "description": "ZHVI Single-Family Homes",
    },
    "zhvi_condo": {
        "category": "zhvi",
        "template": "{geo}_zhvi_uc_condo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip", "Neighborhood"],
        "description": "ZHVI Condo/Co-op",
    },
    "zhvi_1bd": {
        "category": "zhvi",
        "template": "{geo}_zhvi_bdrmcnt_1_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip"],
        "description": "ZHVI 1-Bedroom",
    },
    "zhvi_2bd": {
        "category": "zhvi",
        "template": "{geo}_zhvi_bdrmcnt_2_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip"],
        "description": "ZHVI 2-Bedroom",
    },
    "zhvi_3bd": {
        "category": "zhvi",
        "template": "{geo}_zhvi_bdrmcnt_3_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip"],
        "description": "ZHVI 3-Bedroom",
    },
    "zhvi_4bd": {
        "category": "zhvi",
        "template": "{geo}_zhvi_bdrmcnt_4_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip"],
        "description": "ZHVI 4-Bedroom",
    },
    "zhvi_5bd": {
        "category": "zhvi",
        "template": "{geo}_zhvi_bdrmcnt_5_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip"],
        "description": "ZHVI 5+ Bedroom",
    },
    # RENTALS - ZORI
    "zori_all_sm": {
        "category": "zori",
        "template": "{geo}_zori_uc_sfrcondomfr_sm_month.csv",
        "geographies": ["Metro", "Zip", "County", "City"],
        "description": "ZORI Smoothed: All Homes Plus Multifamily",
    },
    "zori_all_sm_sa": {
        "category": "zori",
        "template": "{geo}_zori_uc_sfrcondomfr_sm_sa_month.csv",
        "geographies": ["Metro", "Zip", "County", "City"],
        "description": "ZORI Smoothed, Seasonally Adjusted: All Homes Plus Multifamily",
    },
    "zori_sfr_sm": {
        "category": "zori",
        "template": "{geo}_zori_uc_sfr_sm_month.csv",
        "geographies": ["Metro", "Zip", "County", "City"],
        "description": "ZORI Smoothed: Single Family Residence",
    },
    # FOR-SALE INVENTORY
    "invt_fs_sm_month": {
        "category": "invt_fs",
        "template": "{geo}_invt_fs_uc_sfrcondo_sm_month.csv",
        "geographies": ["Metro"],
        "description": "For-Sale Inventory (Smooth, All Homes, Monthly)",
    },
    "invt_fs_sm_week": {
        "category": "invt_fs",
        "template": "{geo}_invt_fs_uc_sfrcondo_sm_week.csv",
        "geographies": ["Metro"],
        "description": "For-Sale Inventory (Smooth, All Homes, Weekly)",
    },
    # NEW LISTINGS
    "new_listings_sm_month": {
        "category": "new_listings",
        "template": "{geo}_new_listings_uc_sfrcondo_sm_month.csv",
        "geographies": ["Metro"],
        "description": "New Listings (Smooth, All Homes, Monthly)",
    },
    # SALES
    "sales_count_now": {
        "category": "sales_count_now",
        "template": "{geo}_sales_count_now_uc_sfrcondo_month.csv",
        "geographies": ["Metro"],
        "description": "Sales Count (Nowcast, All Homes, Monthly)",
    },
    # MARKET HEAT INDEX
    "market_heat": {
        "category": "market_temp_index",
        "template": "{geo}_market_temp_index_uc_sfrcondo_month.csv",
        "geographies": ["Metro"],
        "description": "Market Heat Index (All Homes, Monthly)",
    },
}

# Default categories to download
DEFAULT_CATEGORIES = ["zhvi", "zori"]

# Download settings
DOWNLOAD_SETTINGS = {
    "max_workers": 5,
    "timeout": 30,
    "rate_limit_delay": 0.1,
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

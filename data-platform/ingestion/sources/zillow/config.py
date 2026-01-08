"""
Zillow Data Source Configuration.

Central configuration for all Zillow data URLs, patterns, and settings.
"""

from __future__ import annotations

from typing import TypedDict


class DatasetInfo(TypedDict):
    """Type definition for dataset info."""

    category: str
    template: str
    geographies: list[str]
    description: str


# Base URL for Zillow data files
BASE_CDN_URL = "https://files.zillowstatic.com/research/public_csvs"

# Default categories to download (Phase 2: Market Heat & Affordability)
DEFAULT_CATEGORIES = [
    # Phase 1: Core Data
    "zhvi",
    "zori", 
    "invt_fs",
    # Phase 2: Market Heat & Affordability
    "market_temp_index",
    "mortgage_payment",
    "total_monthly_payment",
    "new_homeowner_income_needed",
    "new_renter_income_needed",
]

# Download settings
DOWNLOAD_SETTINGS = {
    "max_concurrent": 5,
    "timeout": 30,
    "retry_attempts": 3,
    "retry_delay": 1.0,
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

# All URL patterns based on Zillow documentation
URL_PATTERNS: dict[str, DatasetInfo] = {
    # =========================================================================
    # HOME VALUES - ZHVI
    # =========================================================================
    "zhvi_all_sm_sa": {
        "category": "zhvi",
        "template": "{geo}_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County", "City", "Zip", "Neighborhood"],
        "description": "ZHVI All Homes Smoothed, Seasonally Adjusted",
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
    # =========================================================================
    # MORTGAGE PAYMENTS
    # =========================================================================
    "mortgage_20pct": {
        "category": "mortgage_payment",
        "template": "{geo}_mortgage_payment_downpayment_0.20_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County"],
        "description": "Mortgage Payment: 20% down",
    },
    "mortgage_10pct": {
        "category": "mortgage_payment",
        "template": "{geo}_mortgage_payment_downpayment_0.10_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County"],
        "description": "Mortgage Payment: 10% down",
    },
    "mortgage_5pct": {
        "category": "mortgage_payment",
        "template": "{geo}_mortgage_payment_downpayment_0.05_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County"],
        "description": "Mortgage Payment: 5% down",
    },
    "total_payment_20pct": {
        "category": "total_monthly_payment",
        "template": "{geo}_total_monthly_payment_downpayment_0.20_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County"],
        "description": "Total Monthly Payment: 20% down",
    },
    "total_payment_10pct": {
        "category": "total_monthly_payment",
        "template": "{geo}_total_monthly_payment_downpayment_0.10_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County"],
        "description": "Total Monthly Payment: 10% down",
    },
    "total_payment_5pct": {
        "category": "total_monthly_payment",
        "template": "{geo}_total_monthly_payment_downpayment_0.05_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "State", "County"],
        "description": "Total Monthly Payment: 5% down",
    },
    # =========================================================================
    # HOME VALUE FORECASTS
    # =========================================================================
    "zhvf_sm_sa": {
        "category": "zhvf_growth",
        "template": "{geo}_zhvf_growth_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro", "Zip"],
        "description": "ZHVF Forecast, Smoothed, Seasonally Adjusted",
    },
    "zhvf_raw": {
        "category": "zhvf_growth",
        "template": "{geo}_zhvf_growth_uc_sfrcondo_tier_0.33_0.67_month.csv",
        "geographies": ["Metro", "Zip"],
        "description": "ZHVF Forecast, Raw",
    },
    # =========================================================================
    # RENTALS - ZORI
    # =========================================================================
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
    "zori_sfr_sm_sa": {
        "category": "zori",
        "template": "{geo}_zori_uc_sfr_sm_sa_month.csv",
        "geographies": ["Metro", "Zip", "County", "City"],
        "description": "ZORI Smoothed, Seasonally Adjusted: Single Family Residence",
    },
    "zori_mfr_sm": {
        "category": "zori",
        "template": "{geo}_zori_uc_mfr_sm_month.csv",
        "geographies": ["Metro", "Zip", "County", "City"],
        "description": "ZORI Smoothed: Multi Family Residence",
    },
    "zori_mfr_sm_sa": {
        "category": "zori",
        "template": "{geo}_zori_uc_mfr_sm_sa_month.csv",
        "geographies": ["Metro", "Zip", "County", "City"],
        "description": "ZORI Smoothed, Seasonally Adjusted: Multi Family Residence",
    },
    # =========================================================================
    # ZORDI - Renter Demand
    # =========================================================================
    "zordi_all": {
        "category": "zordi",
        "template": "{geo}_zordi_uc_sfrcondomfr_month.csv",
        "geographies": ["Metro"],
        "description": "ZORDI: All Homes Plus Multifamily",
    },
    "zordi_sfr": {
        "category": "zordi",
        "template": "{geo}_zordi_uc_sfr_month.csv",
        "geographies": ["Metro"],
        "description": "ZORDI: Single Family Residence",
    },
    "zordi_condo": {
        "category": "zordi",
        "template": "{geo}_zordi_uc_condo_month.csv",
        "geographies": ["Metro"],
        "description": "ZORDI: Condo/Co-op",
    },
    "zordi_mfr": {
        "category": "zordi",
        "template": "{geo}_zordi_uc_mfr_month.csv",
        "geographies": ["Metro"],
        "description": "ZORDI: Multifamily Residence",
    },
    # =========================================================================
    # RENTAL FORECASTS
    # =========================================================================
    "zorf_sfr": {
        "category": "zorf_growth",
        "template": "National_zorf_growth_uc_sfr_sm_month.csv",
        "geographies": ["National"],
        "description": "ZORF: Single Family Residence",
    },
    "zorf_mfr": {
        "category": "zorf_growth",
        "template": "National_zorf_growth_uc_mfr_sm_month.csv",
        "geographies": ["National"],
        "description": "ZORF: Multi Family Residence",
    },
    # =========================================================================
    # FOR-SALE INVENTORY
    # =========================================================================
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
    "invt_fs_sfr_sm_month": {
        "category": "invt_fs",
        "template": "{geo}_invt_fs_uc_sfr_sm_month.csv",
        "geographies": ["Metro"],
        "description": "For-Sale Inventory (Smooth, SFR Only, Monthly)",
    },
    "invt_fs_sfr_sm_week": {
        "category": "invt_fs",
        "template": "{geo}_invt_fs_uc_sfr_sm_week.csv",
        "geographies": ["Metro"],
        "description": "For-Sale Inventory (Smooth, SFR Only, Weekly)",
    },
    "invt_fs_raw_month": {
        "category": "invt_fs",
        "template": "{geo}_invt_fs_uc_sfrcondo_month.csv",
        "geographies": ["Metro"],
        "description": "For-Sale Inventory (Raw, All Homes, Monthly)",
    },
    "invt_fs_raw_week": {
        "category": "invt_fs",
        "template": "{geo}_invt_fs_uc_sfrcondo_week.csv",
        "geographies": ["Metro"],
        "description": "For-Sale Inventory (Raw, All Homes, Weekly)",
    },
    # =========================================================================
    # NEW LISTINGS
    # =========================================================================
    "new_listings_sm_month": {
        "category": "new_listings",
        "template": "{geo}_new_listings_uc_sfrcondo_sm_month.csv",
        "geographies": ["Metro"],
        "description": "New Listings (Smooth, All Homes, Monthly)",
    },
    "new_listings_sm_week": {
        "category": "new_listings",
        "template": "{geo}_new_listings_uc_sfrcondo_sm_week.csv",
        "geographies": ["Metro"],
        "description": "New Listings (Smooth, All Homes, Weekly)",
    },
    "new_listings_raw_month": {
        "category": "new_listings",
        "template": "{geo}_new_listings_uc_sfrcondo_month.csv",
        "geographies": ["Metro"],
        "description": "New Listings (Raw, All Homes, Monthly)",
    },
    "new_listings_raw_week": {
        "category": "new_listings",
        "template": "{geo}_new_listings_uc_sfrcondo_week.csv",
        "geographies": ["Metro"],
        "description": "New Listings (Raw, All Homes, Weekly)",
    },
    # =========================================================================
    # SALES
    # =========================================================================
    "sales_count_now": {
        "category": "sales_count_now",
        "template": "{geo}_sales_count_now_uc_sfrcondo_month.csv",
        "geographies": ["Metro"],
        "description": "Sales Count (Nowcast, All Homes, Monthly)",
    },
    # =========================================================================
    # MARKET HEAT INDEX
    # =========================================================================
    "market_heat": {
        "category": "market_temp_index",
        "template": "{geo}_market_temp_index_uc_sfrcondo_month.csv",
        "geographies": ["Metro"],
        "description": "Market Heat Index (All Homes, Monthly)",
    },
    # =========================================================================
    # AFFORDABILITY
    # =========================================================================
    "income_needed_homeowner": {
        "category": "new_homeowner_income_needed",
        "template": "{geo}_new_homeowner_income_needed_downpayment_0.20_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
        "geographies": ["Metro"],
        "description": "New Homeowner Income Needed: 20% down",
    },
    "income_needed_renter": {
        "category": "new_renter_income_needed",
        "template": "{geo}_new_renter_income_needed_uc_sfrcondomfr_sm_sa_month.csv",
        "geographies": ["Metro"],
        "description": "New Renter Income Needed",
    },
}

# Categories grouped by type
CATEGORY_GROUPS = {
    "home_values": ["zhvi", "zhvf_growth"],
    "rentals": ["zori", "zordi", "zorf_growth"],
    "inventory": ["invt_fs", "new_listings"],
    "sales": ["sales_count_now"],
    "market": ["market_temp_index"],
    "affordability": [
        "mortgage_payment",
        "total_monthly_payment",
        "new_homeowner_income_needed",
        "new_renter_income_needed",
    ],
}

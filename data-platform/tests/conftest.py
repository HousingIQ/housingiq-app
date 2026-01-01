"""
Pytest configuration and fixtures for data platform tests.
"""

from pathlib import Path

import polars as pl
import pytest


@pytest.fixture
def sample_zhvi_csv(tmp_path: Path) -> Path:
    """Create a sample ZHVI CSV file for testing."""
    csv_content = """RegionID,RegionName,State,Metro,CountyName,2023-01-31,2023-02-28,2023-03-31
12345,San Francisco,CA,San Francisco-Oakland-Berkeley,San Francisco County,1200000,1210000,1220000
12346,Oakland,CA,San Francisco-Oakland-Berkeley,Alameda County,800000,810000,820000
12347,San Jose,CA,San Jose-Sunnyvale-Santa Clara,Santa Clara County,1500000,1520000,1540000
"""
    csv_path = tmp_path / "zhvi" / "Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(csv_content)
    return csv_path


@pytest.fixture
def sample_zori_csv(tmp_path: Path) -> Path:
    """Create a sample ZORI CSV file for testing."""
    csv_content = """RegionID,RegionName,State,Metro,CountyName,2023-01-31,2023-02-28,2023-03-31
12345,San Francisco,CA,San Francisco-Oakland-Berkeley,San Francisco County,3500,3550,3600
12346,Oakland,CA,San Francisco-Oakland-Berkeley,Alameda County,2800,2850,2900
12347,San Jose,CA,San Jose-Sunnyvale-Santa Clara,Santa Clara County,3200,3250,3300
"""
    csv_path = tmp_path / "zori" / "Metro_zori_uc_sfrcondomfr_sm_sa_month.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(csv_content)
    return csv_path


@pytest.fixture
def sample_regions_df() -> pl.DataFrame:
    """Create a sample regions DataFrame for testing."""
    return pl.DataFrame({
        "region_id": ["12345", "12346", "12347"],
        "region_name": ["San Francisco", "Oakland", "San Jose"],
        "geography_level": ["Metro", "Metro", "Metro"],
        "state_code": ["CA", "CA", "CA"],
        "state_name": ["California", "California", "California"],
        "city": ["", "", ""],
        "county_name": ["San Francisco County", "Alameda County", "Santa Clara County"],
        "metro": ["San Francisco-Oakland-Berkeley", "San Francisco-Oakland-Berkeley", "San Jose-Sunnyvale-Santa Clara"],
    })


@pytest.fixture
def sample_zhvi_values_df() -> pl.DataFrame:
    """Create a sample ZHVI values DataFrame for testing."""
    from datetime import date

    return pl.DataFrame({
        "region_id": ["12345", "12345", "12345", "12346", "12346", "12346"],
        "date": [
            date(2023, 1, 31), date(2023, 2, 28), date(2023, 3, 31),
            date(2023, 1, 31), date(2023, 2, 28), date(2023, 3, 31),
        ],
        "value": [1200000.0, 1210000.0, 1220000.0, 800000.0, 810000.0, 820000.0],
        "geography_level": ["Metro"] * 6,
        "home_type": ["All Homes"] * 6,
        "tier": ["Mid-Tier"] * 6,
        "smoothed": [True] * 6,
        "seasonally_adjusted": [True] * 6,
        "frequency": ["monthly"] * 6,
    })

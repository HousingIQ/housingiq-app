"""
Pytest configuration and fixtures for data platform tests.
"""

from datetime import date
from pathlib import Path

import polars as pl
import pytest


# ============================================================================
# Ingestion-layer fixtures (existing)
# ============================================================================


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


# ============================================================================
# Transform-layer fixtures
# ============================================================================


def _monthly_dates(start_year: int, start_month: int, count: int) -> list[date]:
    """Generate a list of month-end dates.

    Produces ``count`` consecutive month-end dates starting from the given
    year/month.  The day is always the last day of the month (approximated
    as the 28th for simplicity in Feb, 30th/31st elsewhere).
    """
    import calendar

    dates: list[date] = []
    y, m = start_year, start_month
    for _ in range(count):
        last_day = calendar.monthrange(y, m)[1]
        dates.append(date(y, m, last_day))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return dates


@pytest.fixture
def sample_zhvi_fact_df() -> pl.DataFrame:
    """24 months of ZHVI data for 2 regions -- enough to test YoY (12-month lag).

    Region 12345: values start at 1_000_000 and increase by 10_000/month.
    Region 12346: values start at   500_000 and increase by  5_000/month.
    """
    months = 24
    dates = _monthly_dates(2022, 1, months)

    region_ids = ["12345"] * months + ["12346"] * months
    date_vals = dates * 2
    values = [1_000_000.0 + i * 10_000 for i in range(months)] + [
        500_000.0 + i * 5_000 for i in range(months)
    ]

    return pl.DataFrame({
        "region_id": region_ids,
        "date": date_vals,
        "value": values,
        "geography_level": ["Metro"] * (months * 2),
        "home_type": ["All Homes"] * (months * 2),
        "tier": ["Mid-Tier"] * (months * 2),
        "bedrooms": [None] * (months * 2),
        "smoothed": [True] * (months * 2),
        "seasonally_adjusted": [True] * (months * 2),
        "frequency": ["monthly"] * (months * 2),
    })


@pytest.fixture
def sample_zori_fact_df() -> pl.DataFrame:
    """24 months of ZORI data for 2 regions -- enough to test YoY (12-month lag).

    Region 12345: rents start at 3_000 and increase by 50/month.
    Region 12346: rents start at 2_000 and increase by 30/month.
    """
    months = 24
    dates = _monthly_dates(2022, 1, months)

    region_ids = ["12345"] * months + ["12346"] * months
    date_vals = dates * 2
    values = [3_000.0 + i * 50 for i in range(months)] + [
        2_000.0 + i * 30 for i in range(months)
    ]

    return pl.DataFrame({
        "region_id": region_ids,
        "date": date_vals,
        "value": values,
        "geography_level": ["Metro"] * (months * 2),
        "home_type": ["All Homes"] * (months * 2),
        "smoothed": [True] * (months * 2),
        "seasonally_adjusted": [True] * (months * 2),
        "frequency": ["monthly"] * (months * 2),
    })


@pytest.fixture
def sample_regions_dimension_df() -> pl.DataFrame:
    """Regions with all 5 geography levels for display-name testing."""
    return pl.DataFrame({
        "region_id": ["1", "2", "3", "4", "5"],
        "region_name": [
            "United States", "California", "San Francisco-Oakland-Berkeley",
            "San Francisco County", "San Francisco",
        ],
        "geography_level": ["National", "State", "Metro", "County", "City"],
        "state_code": ["", "CA", "CA", "CA", "CA"],
        "state_name": ["", "California", "California", "California", "California"],
        "city": ["", "", "", "", "San Francisco"],
        "county_name": ["", "", "", "San Francisco County", "San Francisco County"],
        "metro": [
            "", "", "San Francisco-Oakland-Berkeley",
            "San Francisco-Oakland-Berkeley", "San Francisco-Oakland-Berkeley",
        ],
        "size_rank": [1, 2, 3, 4, 5],
    })


@pytest.fixture
def sample_inventory_csv_file(tmp_path: Path) -> Path:
    """Create a sample inventory CSV in the expected Zillow format.

    3 regions x 3 date columns, mimicking Metro-level smoothed inventory.
    """
    csv_content = (
        "RegionID,SizeRank,RegionName,RegionType,StateName,"
        "2023-01-31,2023-02-28,2023-03-31\n"
        "12345,1,San Francisco,msa,CA,500,520,540\n"
        "12346,2,Oakland,msa,CA,300,310,320\n"
        "12347,3,San Jose,msa,CA,400,420,440\n"
    )
    csv_path = tmp_path / "invt_fs" / "Metro_invt_fs_sfrcondo_sm_month.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(csv_content)
    return csv_path


@pytest.fixture
def sample_heat_index_csv_file(tmp_path: Path) -> Path:
    """Create a sample market heat index CSV in the expected Zillow format.

    2 regions x 3 date columns.
    """
    csv_content = (
        "RegionID,SizeRank,RegionName,RegionType,StateName,"
        "2023-01-31,2023-02-28,2023-03-31\n"
        "12345,1,San Francisco,msa,CA,75.5,78.2,82.1\n"
        "12346,2,Oakland,msa,CA,45.0,42.3,39.8\n"
    )
    csv_path = tmp_path / "market_temp_index" / "Metro_market_temp_index.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(csv_content)
    return csv_path


@pytest.fixture
def sample_affordability_csv_file(tmp_path: Path) -> Path:
    """Create a sample affordability CSV in the expected Zillow format.

    2 regions x 3 date columns with 20% down payment in filename.
    """
    csv_content = (
        "RegionID,SizeRank,RegionName,RegionType,StateName,"
        "2023-01-31,2023-02-28,2023-03-31\n"
        "12345,1,San Francisco,msa,CA,5200,5250,5300\n"
        "12346,2,Oakland,msa,CA,3400,3430,3460\n"
    )
    csv_path = (
        tmp_path / "mortgage_payment"
        / "Metro_mortgage_payment_downpayment_0.20_month.csv"
    )
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(csv_content)
    return csv_path

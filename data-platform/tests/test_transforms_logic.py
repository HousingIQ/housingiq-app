"""
Unit tests for pure Polars transformation logic.

All tests use in-memory DataFrames -- no file I/O, no Dagster, no Docker.
"""

from datetime import date

import polars as pl
import pytest

from housingiq_dagster.transforms_logic import (
    build_region_display_name,
    classify_market_by_yoy,
    classify_market_temperature,
    compute_heat_index_changes,
    compute_market_summary,
    compute_yoy_mom_changes,
    compute_yoy_mom_pct_only,
    extract_down_payment_pct,
    extract_geography_level,
    extract_home_type,
    parse_affordability_csv,
    parse_heat_index_csv,
    parse_inventory_csv,
)


# ============================================================================
# compute_yoy_mom_changes
# ============================================================================


class TestComputeYoyMomChanges:
    """Tests for the full YoY/MoM change computation (USD + pct)."""

    def test_basic_mom_change(self, sample_zhvi_fact_df: pl.DataFrame):
        """MoM change should equal the difference between consecutive months."""
        result = compute_yoy_mom_changes(
            sample_zhvi_fact_df,
            partition_cols=["region_id", "home_type", "tier", "bedrooms"],
            sort_cols=["region_id", "home_type", "tier", "bedrooms", "date"],
        )

        # Region 12345: constant 10_000/month increase
        r1 = result.filter(pl.col("region_id") == "12345").sort("date")

        # First row should have null MoM (no previous month)
        assert r1["mom_change_usd"][0] is None

        # Second row: 1_010_000 - 1_000_000 = 10_000
        assert r1["mom_change_usd"][1] == 10_000.0

        # MoM percentage: 10_000 / 1_000_000 * 100 = 1.0%
        assert r1["mom_change_pct"][1] == 1.0

    def test_basic_yoy_change(self, sample_zhvi_fact_df: pl.DataFrame):
        """YoY change should compare 12 months apart."""
        result = compute_yoy_mom_changes(
            sample_zhvi_fact_df,
            partition_cols=["region_id", "home_type", "tier", "bedrooms"],
            sort_cols=["region_id", "home_type", "tier", "bedrooms", "date"],
        )

        r1 = result.filter(pl.col("region_id") == "12345").sort("date")

        # First 12 rows should have null YoY
        for i in range(12):
            assert r1["yoy_change_usd"][i] is None

        # 13th row (index 12): value at month 12 minus value at month 0
        # month 12 value: 1_000_000 + 12 * 10_000 = 1_120_000
        # month 0 value:  1_000_000
        # yoy_change_usd = 120_000
        assert r1["yoy_change_usd"][12] == 120_000.0

        # yoy_change_pct: 120_000 / 1_000_000 * 100 = 12.0
        assert r1["yoy_change_pct"][12] == 12.0

    def test_output_columns(self, sample_zhvi_fact_df: pl.DataFrame):
        """Output should contain all expected change columns."""
        result = compute_yoy_mom_changes(
            sample_zhvi_fact_df,
            partition_cols=["region_id", "home_type", "tier", "bedrooms"],
            sort_cols=["region_id", "home_type", "tier", "bedrooms", "date"],
        )
        expected_cols = {
            "prev_month_value", "prev_year_value",
            "mom_change_usd", "mom_change_pct",
            "yoy_change_usd", "yoy_change_pct",
        }
        assert expected_cols.issubset(set(result.columns))

    def test_partitioning_isolates_regions(self, sample_zhvi_fact_df: pl.DataFrame):
        """Each region should compute changes independently."""
        result = compute_yoy_mom_changes(
            sample_zhvi_fact_df,
            partition_cols=["region_id", "home_type", "tier", "bedrooms"],
            sort_cols=["region_id", "home_type", "tier", "bedrooms", "date"],
        )

        # Region 12346: 5_000/month increase, first MoM should be null
        r2 = result.filter(pl.col("region_id") == "12346").sort("date")
        assert r2["mom_change_usd"][0] is None
        assert r2["mom_change_usd"][1] == 5_000.0

    def test_preserves_row_count(self, sample_zhvi_fact_df: pl.DataFrame):
        """Output should have the same number of rows as input."""
        result = compute_yoy_mom_changes(
            sample_zhvi_fact_df,
            partition_cols=["region_id", "home_type", "tier", "bedrooms"],
            sort_cols=["region_id", "home_type", "tier", "bedrooms", "date"],
        )
        assert len(result) == len(sample_zhvi_fact_df)


# ============================================================================
# compute_yoy_mom_pct_only
# ============================================================================


class TestComputeYoyMomPctOnly:
    """Tests for percentage-only YoY/MoM changes (no intermediate columns)."""

    def test_basic_pct_change(self):
        """Simple percentage change calculation."""
        df = pl.DataFrame({
            "region_id": ["A"] * 3,
            "date": [date(2023, 1, 31), date(2023, 2, 28), date(2023, 3, 31)],
            "value": [100.0, 110.0, 121.0],
        })

        result = compute_yoy_mom_pct_only(
            df,
            partition_cols=["region_id"],
            sort_cols=["region_id", "date"],
        )

        assert "mom_change_pct" in result.columns
        assert "yoy_change_pct" in result.columns
        # No intermediate columns should remain
        assert "_prev_month" not in result.columns
        assert "_prev_year" not in result.columns

        r = result.sort("date")
        # First row: null
        assert r["mom_change_pct"][0] is None
        # Second row: (110 - 100) / 100 * 100 = 10.0%
        assert r["mom_change_pct"][1] == 10.0
        # Third row: (121 - 110) / 110 * 100 = 10.0%
        assert r["mom_change_pct"][2] == 10.0

    def test_works_with_integer_column(self):
        """Should handle integer value columns (inventory_count)."""
        df = pl.DataFrame({
            "region_id": ["A"] * 3,
            "date": [date(2023, 1, 31), date(2023, 2, 28), date(2023, 3, 31)],
            "inventory_count": [500, 520, 540],
        })

        result = compute_yoy_mom_pct_only(
            df,
            partition_cols=["region_id"],
            sort_cols=["region_id", "date"],
            value_col="inventory_count",
        )

        r = result.sort("date")
        # (520 - 500) / 500 * 100 = 4.0%
        assert r["mom_change_pct"][1] == 4.0


# ============================================================================
# compute_heat_index_changes
# ============================================================================


class TestComputeHeatIndexChanges:
    """Tests for heat index change computation + market temperature."""

    def test_basic_changes(self):
        """Absolute changes should be computed correctly."""
        df = pl.DataFrame({
            "region_id": ["A"] * 3,
            "date": [date(2023, 1, 31), date(2023, 2, 28), date(2023, 3, 31)],
            "heat_index": [50.0, 55.0, 82.0],
            "geography_level": ["Metro"] * 3,
        })

        result = compute_heat_index_changes(
            df,
            partition_cols=["region_id"],
            sort_cols=["region_id", "date"],
        )

        r = result.sort("date")
        # First row: null change
        assert r["mom_change"][0] is None
        # Second row: 55 - 50 = 5.0
        assert r["mom_change"][1] == 5.0
        # Third row: 82 - 55 = 27.0
        assert r["mom_change"][2] == 27.0

    def test_market_temperature_classification(self):
        """Market temperature bands should be applied correctly."""
        df = pl.DataFrame({
            "region_id": ["A"] * 5,
            "date": [
                date(2023, 1, 31), date(2023, 2, 28), date(2023, 3, 31),
                date(2023, 4, 30), date(2023, 5, 31),
            ],
            "heat_index": [10.0, 25.0, 45.0, 65.0, 85.0],
            "geography_level": ["Metro"] * 5,
        })

        result = compute_heat_index_changes(
            df,
            partition_cols=["region_id"],
            sort_cols=["region_id", "date"],
        )

        r = result.sort("date")
        assert r["market_temperature"][0] == "Cold"      # 10 < 20
        assert r["market_temperature"][1] == "Cool"      # 20 <= 25 < 40
        assert r["market_temperature"][2] == "Balanced"  # 40 <= 45 < 60
        assert r["market_temperature"][3] == "Warm"      # 60 <= 65 < 80
        assert r["market_temperature"][4] == "Hot"       # 85 >= 80

    def test_no_intermediate_columns(self):
        """Intermediate _prev_month and _prev_year should be dropped."""
        df = pl.DataFrame({
            "region_id": ["A"] * 3,
            "date": [date(2023, 1, 31), date(2023, 2, 28), date(2023, 3, 31)],
            "heat_index": [50.0, 55.0, 60.0],
            "geography_level": ["Metro"] * 3,
        })

        result = compute_heat_index_changes(
            df, partition_cols=["region_id"], sort_cols=["region_id", "date"],
        )
        assert "_prev_month" not in result.columns
        assert "_prev_year" not in result.columns


# ============================================================================
# classify_market_by_yoy
# ============================================================================


class TestClassifyMarketByYoy:
    """Tests for market classification expression."""

    def test_thresholds(self):
        """Correct classification at each threshold boundary."""
        df = pl.DataFrame({
            "home_value_yoy_pct": [15.0, 10.01, 10.0, 5.0, 3.0, 2.99, 0.0, -5.0, None],
        })

        result = df.with_columns(classify_market_by_yoy())

        classifications = result["market_classification"].to_list()
        assert classifications[0] == "Hot"      # 15 > 10
        assert classifications[1] == "Hot"      # 10.01 > 10
        assert classifications[2] == "Warm"     # 10 >= 3 (not > 10)
        assert classifications[3] == "Warm"     # 5 >= 3
        assert classifications[4] == "Warm"     # 3 >= 3
        assert classifications[5] == "Cold"     # 2.99 < 3
        assert classifications[6] == "Cold"     # 0 < 3
        assert classifications[7] == "Cold"     # -5 < 3
        assert classifications[8] == "Unknown"  # null


# ============================================================================
# classify_market_temperature
# ============================================================================


class TestClassifyMarketTemperature:
    """Tests for heat index temperature band expression."""

    def test_bands(self):
        """Each band boundary should be classified correctly."""
        df = pl.DataFrame({
            "heat_index": [95.0, 80.0, 79.9, 60.0, 59.9, 40.0, 39.9, 20.0, 19.9, 5.0],
        })

        result = df.with_columns(classify_market_temperature())

        temps = result["market_temperature"].to_list()
        assert temps[0] == "Hot"       # 95 >= 80
        assert temps[1] == "Hot"       # 80 >= 80
        assert temps[2] == "Warm"      # 79.9 < 80 but >= 60
        assert temps[3] == "Warm"      # 60 >= 60
        assert temps[4] == "Balanced"  # 59.9 < 60 but >= 40
        assert temps[5] == "Balanced"  # 40 >= 40
        assert temps[6] == "Cool"      # 39.9 < 40 but >= 20
        assert temps[7] == "Cool"      # 20 >= 20
        assert temps[8] == "Cold"      # 19.9 < 20
        assert temps[9] == "Cold"      # 5 < 20


# ============================================================================
# build_region_display_name
# ============================================================================


class TestBuildRegionDisplayName:
    """Tests for region display name construction."""

    def test_all_geography_levels(self, sample_regions_dimension_df: pl.DataFrame):
        """Each geography level should produce the correct display name."""
        result = build_region_display_name(sample_regions_dimension_df)
        names = result.sort("region_id")["display_name"].to_list()

        assert names[0] == "United States"                         # National
        assert names[1] == "California"                            # State -> state_name
        assert names[2] == "San Francisco-Oakland-Berkeley Metro Area"  # Metro
        assert names[3] == "San Francisco County, CA"              # County
        assert names[4] == "San Francisco, CA"                     # City

    def test_unknown_geography_falls_back(self):
        """Unknown geography levels should fall back to region_name."""
        df = pl.DataFrame({
            "region_id": ["99"],
            "region_name": ["Some Place"],
            "geography_level": ["Neighborhood"],
            "state_code": ["CA"],
            "state_name": ["California"],
            "city": [""],
            "county_name": [""],
        })

        result = build_region_display_name(df)
        assert result["display_name"][0] == "Some Place"


# ============================================================================
# compute_market_summary
# ============================================================================


class TestComputeMarketSummary:
    """Tests for the full market summary computation."""

    def _make_test_data(self) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
        """Build minimal ZHVI, ZORI, and regions DataFrames for summary tests."""
        zhvi_df = pl.DataFrame({
            "region_id": ["1", "1"],
            "date": [date(2023, 1, 31), date(2024, 1, 31)],
            "value": [300_000.0, 345_000.0],
            "home_type": ["All Homes", "All Homes"],
            "tier": ["Mid-Tier", "Mid-Tier"],
            "smoothed": [True, True],
            "seasonally_adjusted": [True, True],
            "yoy_change_pct": [None, 15.0],
            "mom_change_pct": [None, 1.5],
        })

        zori_df = pl.DataFrame({
            "region_id": ["1", "1"],
            "date": [date(2023, 1, 31), date(2024, 1, 31)],
            "value": [2_000.0, 2_100.0],
            "home_type": ["All Homes", "All Homes"],
            "smoothed": [True, True],
            "seasonally_adjusted": [True, True],
            "yoy_change_pct": [None, 5.0],
            "mom_change_pct": [None, 0.5],
        })

        regions_df = pl.DataFrame({
            "region_id": ["1"],
            "region_name": ["Test Metro"],
            "display_name": ["Test Metro Area"],
            "geography_level": ["Metro"],
            "state_code": ["CA"],
            "state_name": ["California"],
            "metro": ["Test Metro"],
            "size_rank": [1],
        })

        return zhvi_df, zori_df, regions_df

    def test_latest_values_selected(self):
        """Summary should pick the most recent date per region."""
        zhvi_df, zori_df, regions_df = self._make_test_data()
        result = compute_market_summary(zhvi_df, zori_df, regions_df)

        assert len(result) == 1
        assert result["current_home_value"][0] == 345_000.0
        assert result["current_rent_value"][0] == 2_100.0

    def test_price_to_rent_ratio(self):
        """Price-to-rent = home_value / (rent * 12)."""
        zhvi_df, zori_df, regions_df = self._make_test_data()
        result = compute_market_summary(zhvi_df, zori_df, regions_df)

        # 345_000 / (2_100 * 12) = 345_000 / 25_200 = 13.69 (rounded to 2)
        expected = round(345_000 / (2_100 * 12), 2)
        assert result["price_to_rent_ratio"][0] == expected

    def test_gross_rent_yield(self):
        """Gross rent yield = (rent * 12) / home_value * 100."""
        zhvi_df, zori_df, regions_df = self._make_test_data()
        result = compute_market_summary(zhvi_df, zori_df, regions_df)

        expected = round((2_100 * 12) / 345_000 * 100, 2)
        assert result["gross_rent_yield_pct"][0] == expected

    def test_market_classification_hot(self):
        """Region with >10% YoY should be classified as Hot."""
        zhvi_df, zori_df, regions_df = self._make_test_data()
        result = compute_market_summary(zhvi_df, zori_df, regions_df)

        # YoY is 15.0 -> Hot
        assert result["market_classification"][0] == "Hot"

    def test_filters_out_null_home_value(self):
        """Regions with no home value should be excluded."""
        zhvi_df, zori_df, regions_df = self._make_test_data()

        # Add a region with no ZHVI data
        extra_region = pl.DataFrame({
            "region_id": ["2"],
            "region_name": ["No Data"],
            "display_name": ["No Data Area"],
            "geography_level": ["Metro"],
            "state_code": ["TX"],
            "state_name": ["Texas"],
            "metro": ["No Data"],
            "size_rank": [99],
        })
        regions_df = pl.concat([regions_df, extra_region])

        result = compute_market_summary(zhvi_df, zori_df, regions_df)
        # Only region "1" should appear (region "2" has null home value)
        assert len(result) == 1
        assert result["region_id"][0] == "1"


# ============================================================================
# extract_geography_level / extract_home_type / extract_down_payment_pct
# ============================================================================


class TestFilenameExtractors:
    """Tests for metadata extraction from filenames."""

    @pytest.mark.parametrize("filename,expected", [
        ("Metro_invt_fs_sfrcondo_sm_month.csv", "Metro"),
        ("State_invt_fs_sfrcondo_sm_month.csv", "State"),
        ("County_invt_fs_sfrcondo_sm_month.csv", "County"),
        ("City_invt_fs_sfrcondo_sm_month.csv", "City"),
        ("Zip_invt_fs_sfrcondo_sm_month.csv", "Zip"),
        ("Unknown_file.csv", "Unknown"),
    ])
    def test_extract_geography_level(self, filename: str, expected: str):
        assert extract_geography_level(filename) == expected

    @pytest.mark.parametrize("filename,expected", [
        ("Metro_invt_fs_sfrcondo_sm_month.csv", "All Homes"),
        ("Metro_invt_fs_sfr_sm_month.csv", "Single Family"),
        ("Metro_invt_fs_condo_sm_month.csv", "Condo"),
        ("Metro_invt_fs_sm_month.csv", "All Homes"),  # default
    ])
    def test_extract_home_type(self, filename: str, expected: str):
        assert extract_home_type(filename) == expected

    @pytest.mark.parametrize("filename,expected", [
        ("Metro_mortgage_payment_downpayment_0.20_month.csv", 20.0),
        ("Metro_mortgage_payment_downpayment_0.05_month.csv", 5.0),
        ("Metro_mortgage_payment_downpayment_0.10_month.csv", 10.0),
        ("Metro_renter_income_needed_month.csv", None),
    ])
    def test_extract_down_payment_pct(self, filename: str, expected: float | None):
        assert extract_down_payment_pct(filename) == expected


# ============================================================================
# parse_inventory_csv
# ============================================================================


class TestParseInventoryCsv:
    """Tests for inventory CSV parsing."""

    def test_basic_parse(self):
        """Should melt wide CSV into long format with correct metadata."""
        df = pl.DataFrame({
            "RegionID": [12345, 12346],
            "SizeRank": [1, 2],
            "RegionName": ["San Francisco", "Oakland"],
            "RegionType": ["msa", "msa"],
            "StateName": ["CA", "CA"],
            "2023-01-31": [500, 520],
            "2023-02-28": [510, 530],
        })

        result = parse_inventory_csv(df, "Metro_invt_fs_sfrcondo_sm_month.csv")

        assert result is not None
        assert len(result) == 4  # 2 regions x 2 dates
        assert set(result.columns) == {
            "region_id", "date", "inventory_count",
            "geography_level", "home_type", "smoothed", "frequency",
        }
        assert result["geography_level"][0] == "Metro"
        assert result["home_type"][0] == "All Homes"
        assert result["smoothed"][0] is True

    def test_returns_none_for_no_date_cols(self):
        """Should return None if no date columns found."""
        df = pl.DataFrame({
            "RegionID": [12345],
            "RegionName": ["San Francisco"],
        })

        result = parse_inventory_csv(df, "Metro_invt_fs_sfrcondo_sm_month.csv")
        assert result is None


# ============================================================================
# parse_heat_index_csv
# ============================================================================


class TestParseHeatIndexCsv:
    """Tests for heat index CSV parsing."""

    def test_basic_parse(self):
        """Should melt wide CSV into long format."""
        df = pl.DataFrame({
            "RegionID": [12345],
            "SizeRank": [1],
            "RegionName": ["San Francisco"],
            "RegionType": ["msa"],
            "StateName": ["CA"],
            "2023-01-31": [75.5],
            "2023-02-28": [78.2],
        })

        result = parse_heat_index_csv(df, "Metro_market_temp_index.csv")

        assert result is not None
        assert len(result) == 2
        assert set(result.columns) == {
            "region_id", "date", "heat_index", "geography_level",
        }
        assert result["geography_level"][0] == "Metro"
        assert result["heat_index"].dtype == pl.Float64

    def test_national_default(self):
        """Files without a known prefix should default to National."""
        df = pl.DataFrame({
            "RegionID": [1],
            "RegionName": ["US"],
            "2023-01-31": [50.0],
        })

        result = parse_heat_index_csv(df, "national_market_temp_index.csv")
        assert result is not None
        assert result["geography_level"][0] == "National"


# ============================================================================
# parse_affordability_csv
# ============================================================================


class TestParseAffordabilityCsv:
    """Tests for affordability CSV parsing."""

    def test_basic_parse_with_down_payment(self):
        """Should extract down payment percentage from filename."""
        df = pl.DataFrame({
            "RegionID": [12345],
            "SizeRank": [1],
            "RegionName": ["San Francisco"],
            "RegionType": ["msa"],
            "StateName": ["CA"],
            "2023-01-31": [5200.0],
            "2023-02-28": [5250.0],
        })

        result = parse_affordability_csv(
            df,
            "Metro_mortgage_payment_downpayment_0.20_month.csv",
            "mortgage_payment",
        )

        assert result is not None
        assert len(result) == 2
        assert result["metric_type"][0] == "mortgage_payment"
        assert result["down_payment_pct"][0] == 20.0
        assert result["geography_level"][0] == "Metro"

    def test_no_down_payment_in_filename(self):
        """Should handle files without down payment info (returns None)."""
        df = pl.DataFrame({
            "RegionID": [12345],
            "RegionName": ["San Francisco"],
            "2023-01-31": [80000.0],
        })

        result = parse_affordability_csv(
            df,
            "Metro_renter_income_needed_month.csv",
            "renter_income_needed",
        )

        assert result is not None
        assert result["down_payment_pct"][0] is None
        assert result["metric_type"][0] == "renter_income_needed"

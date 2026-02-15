"""
Dagster asset integration tests.

Tests the @asset functions from transforms.py using ``build_asset_context``
and ``monkeypatch`` to redirect file paths to ``tmp_path``.

No Docker or database required -- only filesystem I/O to temp directories.
"""

from pathlib import Path

import polars as pl
import pytest
from dagster import build_asset_context

from housingiq_dagster.assets.transforms import (
    aggregate_market_summary,
    dimension_regions,
    fact_affordability_metrics,
    fact_inventory_values,
    fact_market_heat_index,
    fact_zhvi_values,
    fact_zori_values,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _patch_paths(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> dict[str, Path]:
    """Redirect STAGING_DIR, MART_DIR, and RAW_DIR to temp directories."""
    staging = tmp_path / "staging"
    mart = tmp_path / "mart"
    raw = tmp_path / "raw"
    staging.mkdir()
    mart.mkdir()
    raw.mkdir()

    monkeypatch.setattr("housingiq_dagster.assets.transforms.STAGING_DIR", staging)
    monkeypatch.setattr("housingiq_dagster.assets.transforms.MART_DIR", mart)
    monkeypatch.setattr("housingiq_dagster.assets.transforms.RAW_DIR", raw)

    return {"staging": staging, "mart": mart, "raw": raw}


# ============================================================================
# fact_zhvi_values
# ============================================================================


class TestFactZhviValuesAsset:
    """Tests for the fact_zhvi_values Dagster asset."""

    def test_produces_output_with_change_columns(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
        sample_zhvi_fact_df: pl.DataFrame,
    ):
        """Asset should write a parquet with YoY/MoM columns."""
        dirs = _patch_paths(monkeypatch, tmp_path)
        sample_zhvi_fact_df.write_parquet(dirs["staging"] / "zhvi_values.parquet")

        context = build_asset_context()
        result = fact_zhvi_values(context)

        assert result.metadata["row_count"].value == len(sample_zhvi_fact_df)

        output = pl.read_parquet(dirs["mart"] / "fact_zhvi_values.parquet")
        assert "yoy_change_pct" in output.columns
        assert "mom_change_pct" in output.columns
        assert len(output) == len(sample_zhvi_fact_df)

    def test_returns_no_data_when_file_missing(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
    ):
        """Asset should return no_data metadata when input is missing."""
        _patch_paths(monkeypatch, tmp_path)

        context = build_asset_context()
        result = fact_zhvi_values(context)

        assert result.metadata["status"] == "no_data"


# ============================================================================
# fact_zori_values
# ============================================================================


class TestFactZoriValuesAsset:
    """Tests for the fact_zori_values Dagster asset."""

    def test_produces_output(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
        sample_zori_fact_df: pl.DataFrame,
    ):
        """Asset should write ZORI fact parquet."""
        dirs = _patch_paths(monkeypatch, tmp_path)
        sample_zori_fact_df.write_parquet(dirs["staging"] / "zori_values.parquet")

        context = build_asset_context()
        result = fact_zori_values(context)

        assert result.metadata["row_count"].value == len(sample_zori_fact_df)

        output = pl.read_parquet(dirs["mart"] / "fact_zori_values.parquet")
        assert "yoy_change_pct" in output.columns

    def test_returns_no_data_when_file_missing(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
    ):
        _patch_paths(monkeypatch, tmp_path)
        context = build_asset_context()
        result = fact_zori_values(context)
        assert result.metadata["status"] == "no_data"


# ============================================================================
# dimension_regions
# ============================================================================


class TestDimensionRegionsAsset:
    """Tests for the dimension_regions Dagster asset."""

    def test_adds_display_name(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
        sample_regions_dimension_df: pl.DataFrame,
    ):
        """Asset should add display_name and write parquet."""
        dirs = _patch_paths(monkeypatch, tmp_path)
        sample_regions_dimension_df.write_parquet(
            dirs["staging"] / "zhvi_regions.parquet"
        )

        context = build_asset_context()
        result = dimension_regions(context)

        assert result.metadata["row_count"].value == len(sample_regions_dimension_df)

        output = pl.read_parquet(dirs["mart"] / "dimension_regions.parquet")
        assert "display_name" in output.columns

    def test_returns_no_data_when_file_missing(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
    ):
        _patch_paths(monkeypatch, tmp_path)
        context = build_asset_context()
        result = dimension_regions(context)
        assert result.metadata["status"] == "no_data"


# ============================================================================
# aggregate_market_summary
# ============================================================================


class TestAggregateMarketSummaryAsset:
    """Tests for the aggregate_market_summary Dagster asset."""

    def test_produces_summary(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
        sample_zhvi_fact_df: pl.DataFrame,
        sample_zori_fact_df: pl.DataFrame,
    ):
        """Asset should produce a market summary parquet from 3 inputs."""
        dirs = _patch_paths(monkeypatch, tmp_path)

        from housingiq_dagster.transforms_logic import (
            build_region_display_name,
            compute_yoy_mom_changes,
        )

        # Build the upstream mart files
        zhvi_transformed = compute_yoy_mom_changes(
            sample_zhvi_fact_df,
            partition_cols=["region_id", "home_type", "tier", "bedrooms"],
            sort_cols=["region_id", "home_type", "tier", "bedrooms", "date"],
        )
        zori_transformed = compute_yoy_mom_changes(
            sample_zori_fact_df,
            partition_cols=["region_id", "home_type"],
            sort_cols=["region_id", "home_type", "date"],
        )

        # Build a regions fixture whose IDs match the ZHVI/ZORI fixtures
        # (sample_zhvi_fact_df uses "12345" and "12346")
        matching_regions = pl.DataFrame({
            "region_id": ["12345", "12346"],
            "region_name": ["San Francisco-Oakland-Berkeley", "San Jose-Sunnyvale"],
            "geography_level": ["Metro", "Metro"],
            "state_code": ["CA", "CA"],
            "state_name": ["California", "California"],
            "city": ["", ""],
            "county_name": ["", ""],
            "metro": ["San Francisco-Oakland-Berkeley", "San Jose-Sunnyvale"],
            "size_rank": [1, 2],
        })
        regions_transformed = build_region_display_name(matching_regions)

        zhvi_transformed.write_parquet(dirs["mart"] / "fact_zhvi_values.parquet")
        zori_transformed.write_parquet(dirs["mart"] / "fact_zori_values.parquet")
        regions_transformed.write_parquet(dirs["mart"] / "dimension_regions.parquet")

        context = build_asset_context()
        result = aggregate_market_summary(context)

        # Both fixture regions (12345, 12346) should appear in summary
        assert result.metadata["row_count"].value == 2

        output = pl.read_parquet(dirs["mart"] / "market_summary.parquet")
        expected_cols = {
            "current_home_value", "current_rent_value",
            "price_to_rent_ratio", "gross_rent_yield_pct",
            "market_classification",
        }
        assert expected_cols.issubset(set(output.columns))


# ============================================================================
# fact_inventory_values
# ============================================================================


class TestFactInventoryValuesAsset:
    """Tests for the fact_inventory_values Dagster asset."""

    def test_processes_csv_files(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
        sample_inventory_csv_file: Path,
    ):
        """Asset should parse inventory CSVs and produce parquet."""
        dirs = _patch_paths(monkeypatch, tmp_path)

        # Move fixture CSV into the expected RAW_DIR/invt_fs location
        invt_dir = dirs["raw"] / "invt_fs"
        invt_dir.mkdir()
        import shutil
        shutil.copy(sample_inventory_csv_file, invt_dir / sample_inventory_csv_file.name)

        context = build_asset_context()
        result = fact_inventory_values(context)

        assert result.metadata["row_count"].value > 0

        output = pl.read_parquet(dirs["mart"] / "fact_inventory_values.parquet")
        assert "mom_change_pct" in output.columns
        assert "yoy_change_pct" in output.columns

    def test_returns_no_data_when_dir_missing(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
    ):
        _patch_paths(monkeypatch, tmp_path)
        context = build_asset_context()
        result = fact_inventory_values(context)
        assert result.metadata["status"] == "no_data"


# ============================================================================
# fact_market_heat_index
# ============================================================================


class TestFactMarketHeatIndexAsset:
    """Tests for the fact_market_heat_index Dagster asset."""

    def test_processes_csv_files(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
        sample_heat_index_csv_file: Path,
    ):
        """Asset should parse heat index CSVs and produce parquet."""
        dirs = _patch_paths(monkeypatch, tmp_path)

        heat_dir = dirs["raw"] / "market_temp_index"
        heat_dir.mkdir()
        import shutil
        shutil.copy(sample_heat_index_csv_file, heat_dir / sample_heat_index_csv_file.name)

        context = build_asset_context()
        result = fact_market_heat_index(context)

        assert result.metadata["row_count"].value > 0

        output = pl.read_parquet(dirs["mart"] / "fact_market_heat_index.parquet")
        assert "market_temperature" in output.columns
        assert "mom_change" in output.columns

    def test_returns_no_data_when_dir_missing(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
    ):
        _patch_paths(monkeypatch, tmp_path)
        context = build_asset_context()
        result = fact_market_heat_index(context)
        assert result.metadata["status"] == "no_data"


# ============================================================================
# fact_affordability_metrics
# ============================================================================


class TestFactAffordabilityMetricsAsset:
    """Tests for the fact_affordability_metrics Dagster asset."""

    def test_processes_csv_files(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
        sample_affordability_csv_file: Path,
    ):
        """Asset should parse affordability CSVs and produce parquet."""
        dirs = _patch_paths(monkeypatch, tmp_path)

        # Create the expected category directory structure
        cat_dir = dirs["raw"] / "mortgage_payment"
        cat_dir.mkdir()
        import shutil
        shutil.copy(sample_affordability_csv_file, cat_dir / sample_affordability_csv_file.name)

        context = build_asset_context()
        result = fact_affordability_metrics(context)

        assert result.metadata["row_count"].value > 0

        output = pl.read_parquet(dirs["mart"] / "fact_affordability_metrics.parquet")
        assert "mom_change_pct" in output.columns
        assert "metric_type" in output.columns

    def test_returns_no_data_when_no_categories(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
    ):
        _patch_paths(monkeypatch, tmp_path)
        context = build_asset_context()
        result = fact_affordability_metrics(context)
        assert result.metadata["status"] == "no_data"

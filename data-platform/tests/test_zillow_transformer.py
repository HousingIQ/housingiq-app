"""
Tests for Zillow data transformer.
"""

from pathlib import Path

import polars as pl

from ingestion.sources.zillow.transformer import (
    ZillowTransformer,
)


class TestFileMetadata:
    """Tests for metadata extraction from filenames."""

    def test_extract_zhvi_metadata(self):
        """Test extracting metadata from ZHVI filename."""
        transformer = ZillowTransformer(input_dir=".")
        metadata = transformer.extract_metadata(
            "Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
        )

        assert metadata.geography_level == "Metro"
        assert metadata.home_type == "All Homes"
        assert metadata.tier == "Mid-Tier"
        assert metadata.smoothed is True
        assert metadata.seasonally_adjusted is True
        assert metadata.frequency == "monthly"
        assert metadata.bedrooms is None

    def test_extract_bedroom_metadata(self):
        """Test extracting bedroom count from filename."""
        transformer = ZillowTransformer(input_dir=".")
        metadata = transformer.extract_metadata(
            "Metro_zhvi_bdrmcnt_3_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
        )

        assert metadata.bedrooms == 3

    def test_extract_tier_metadata(self):
        """Test extracting different price tiers."""
        transformer = ZillowTransformer(input_dir=".")

        # Top tier
        meta_top = transformer.extract_metadata(
            "Metro_zhvi_uc_sfrcondo_tier_0.67_1.0_sm_sa_month.csv"
        )
        assert meta_top.tier == "Top-Tier"

        # Bottom tier
        meta_bottom = transformer.extract_metadata(
            "Metro_zhvi_uc_sfrcondo_tier_0.0_0.33_sm_sa_month.csv"
        )
        assert meta_bottom.tier == "Bottom-Tier"

    def test_extract_home_type(self):
        """Test extracting different home types."""
        transformer = ZillowTransformer(input_dir=".")

        # Single Family
        meta_sfr = transformer.extract_metadata(
            "Metro_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv"
        )
        assert meta_sfr.home_type == "Single Family"

        # Condo
        meta_condo = transformer.extract_metadata(
            "Metro_zhvi_uc_condo_tier_0.33_0.67_sm_sa_month.csv"
        )
        assert meta_condo.home_type == "Condo"


class TestZillowTransformer:
    """Tests for ZillowTransformer class."""

    def test_identify_columns(self, sample_zhvi_csv: Path):
        """Test identifying region vs date columns."""
        transformer = ZillowTransformer(input_dir=sample_zhvi_csv.parent.parent)
        df = pl.read_csv(sample_zhvi_csv)

        region_cols, date_cols = transformer.identify_columns(df)

        assert "RegionID" in region_cols
        assert "RegionName" in region_cols
        assert "State" in region_cols
        assert "2023-01-31" in date_cols
        assert "2023-02-28" in date_cols
        assert "2023-03-31" in date_cols

    def test_extract_regions(self, sample_zhvi_csv: Path):
        """Test extracting regions from CSV."""
        transformer = ZillowTransformer(input_dir=sample_zhvi_csv.parent.parent)
        df = pl.read_csv(sample_zhvi_csv)

        regions_df = transformer.extract_regions(df, "Metro")

        assert "region_id" in regions_df.columns
        assert "region_name" in regions_df.columns
        assert "geography_level" in regions_df.columns
        assert len(regions_df) == 3

    def test_unpivot_values(self, sample_zhvi_csv: Path):
        """Test unpivoting values to long format."""
        transformer = ZillowTransformer(input_dir=sample_zhvi_csv.parent.parent)
        df = pl.read_csv(sample_zhvi_csv)

        metadata = transformer.extract_metadata(sample_zhvi_csv.name)
        values_df = transformer.unpivot_values(df, metadata)

        assert "region_id" in values_df.columns
        assert "date" in values_df.columns
        assert "value" in values_df.columns
        assert "home_type" in values_df.columns
        assert "tier" in values_df.columns

        # 3 regions * 3 dates = 9 rows
        assert len(values_df) == 9

    def test_process_file(self, sample_zhvi_csv: Path):
        """Test processing a single file."""
        transformer = ZillowTransformer(input_dir=sample_zhvi_csv.parent.parent)

        regions_df, values_df = transformer.process_file(sample_zhvi_csv)

        assert len(regions_df) == 3
        assert len(values_df) == 9

    def test_save_to_parquet(self, sample_zhvi_csv: Path, tmp_path: Path):
        """Test saving to Parquet format."""
        output_dir = tmp_path / "output"
        transformer = ZillowTransformer(
            input_dir=sample_zhvi_csv.parent.parent,
            output_dir=output_dir,
        )

        regions_df, values_df = transformer.process_file(sample_zhvi_csv)
        regions_path, values_path = transformer.save_to_parquet(
            regions_df, values_df, "zhvi"
        )

        assert regions_path.exists()
        assert values_path.exists()

        # Verify we can read them back
        loaded_regions = pl.read_parquet(regions_path)
        loaded_values = pl.read_parquet(values_path)

        assert len(loaded_regions) == 3
        assert len(loaded_values) == 9


class TestCombineDataframes:
    """Tests for combining DataFrames with schema alignment."""

    def test_combine_with_same_schema(self):
        """Test combining DataFrames with identical schemas."""
        transformer = ZillowTransformer(input_dir=".")

        df1 = pl.DataFrame({"a": [1, 2], "b": ["x", "y"]})
        df2 = pl.DataFrame({"a": [3, 4], "b": ["z", "w"]})

        combined = transformer._combine_dataframes([df1, df2])

        assert len(combined) == 4
        assert combined.columns == ["a", "b"]

    def test_combine_with_different_columns(self):
        """Test combining DataFrames with different columns."""
        transformer = ZillowTransformer(input_dir=".")

        df1 = pl.DataFrame({"a": [1, 2], "b": ["x", "y"]})
        df2 = pl.DataFrame({"a": [3, 4], "c": [1.0, 2.0]})

        combined = transformer._combine_dataframes([df1, df2])

        assert len(combined) == 4
        assert set(combined.columns) == {"a", "b", "c"}

    def test_combine_with_dedup(self):
        """Test combining with deduplication."""
        transformer = ZillowTransformer(input_dir=".")

        df1 = pl.DataFrame({"id": ["a", "b"], "value": [1, 2]})
        df2 = pl.DataFrame({"id": ["b", "c"], "value": [2, 3]})

        combined = transformer._combine_dataframes([df1, df2], unique_subset=["id"])

        assert len(combined) == 3

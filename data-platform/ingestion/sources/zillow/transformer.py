"""
Zillow Data Transformer - Transform raw CSV to normalized format.

Migrated from zillow_data_sc/etl_zhvi.py with improvements:
- Uses Polars for high performance
- Type hints throughout
- Cleaner architecture with separate methods
- Outputs to PostgreSQL raw schema
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import polars as pl

if TYPE_CHECKING:
    pass


@dataclass
class FileMetadata:
    """Metadata extracted from filename."""

    geography_level: str
    home_type: str
    tier: str
    smoothed: bool
    seasonally_adjusted: bool
    frequency: str
    bedrooms: int | None = None


class ZillowTransformer:
    """Transform raw Zillow CSV files to normalized format."""

    def __init__(
        self,
        input_dir: Path | str,
        output_dir: Path | str | None = None,
    ) -> None:
        """
        Initialize transformer.

        Args:
            input_dir: Directory containing raw CSV files
            output_dir: Optional directory for parquet output
        """
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir) if output_dir else None

        if self.output_dir:
            self.output_dir.mkdir(parents=True, exist_ok=True)

    def extract_metadata(self, filename: str) -> FileMetadata:
        """
        Extract metadata from filename.

        Example: Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv
        """
        parts = filename.replace(".csv", "").split("_")

        geography_level = parts[0] if parts else "Unknown"
        smoothed = "sm" in parts
        seasonally_adjusted = "sa" in parts
        raw = "raw" in filename or ("sm" not in parts and "sa" not in parts)
        frequency = "monthly" if "month" in parts else "weekly"

        # Detect home type
        if "sfrcondo" in filename:
            home_type = "All Homes"
        elif "sfr" in filename and "condo" not in filename:
            home_type = "Single Family"
        elif "condo" in filename:
            home_type = "Condo"
        elif "mfr" in filename:
            home_type = "Multi Family"
        elif "sfrcondomfr" in filename:
            home_type = "All Homes Plus Multifamily"
        else:
            home_type = "Unknown"

        # Detect tier
        if "tier_0.33_0.67" in filename:
            tier = "Mid-Tier"
        elif "tier_0.67_1.0" in filename:
            tier = "Top-Tier"
        elif "tier_0.0_0.33" in filename:
            tier = "Bottom-Tier"
        else:
            tier = "All"

        # Detect bedroom count
        bedroom_match = re.search(r"bdrmcnt_(\d+)", filename)
        bedrooms = int(bedroom_match.group(1)) if bedroom_match else None

        return FileMetadata(
            geography_level=geography_level,
            home_type=home_type,
            tier=tier,
            smoothed=smoothed,
            seasonally_adjusted=seasonally_adjusted,
            frequency=frequency,
            bedrooms=bedrooms,
        )

    def identify_columns(self, df: pl.DataFrame) -> tuple[list[str], list[str]]:
        """
        Identify region columns vs date columns.

        Returns:
            Tuple of (region_columns, date_columns)
        """
        date_pattern = re.compile(r"^\d{4}-\d{2}(-\d{2})?$")
        region_cols = []
        date_cols = []

        for col in df.columns:
            if date_pattern.match(str(col)):
                date_cols.append(col)
            else:
                region_cols.append(col)

        return region_cols, date_cols

    def extract_regions(
        self,
        df: pl.DataFrame,
        geography_level: str,
    ) -> pl.DataFrame:
        """
        Extract and normalize region dimension table.

        Args:
            df: Input DataFrame
            geography_level: Geography level from metadata

        Returns:
            Regions DataFrame with standardized columns
        """
        region_cols, _ = self.identify_columns(df)
        regions = df.select(region_cols)

        # Add geography level
        regions = regions.with_columns(
            pl.lit(geography_level).alias("geography_level")
        )

        # Create unique region_id
        if "RegionID" in regions.columns:
            regions = regions.with_columns(
                pl.col("RegionID").cast(pl.Utf8).alias("region_id")
            )
        elif "RegionName" in regions.columns:
            regions = regions.with_columns(
                pl.concat_str([
                    pl.col("RegionName").cast(pl.Utf8),
                    pl.lit("_"),
                    pl.col("State").cast(pl.Utf8).fill_null(""),
                ]).hash().cast(pl.Utf8).alias("region_id")
            )
        else:
            regions = regions.with_row_index("region_id")
            regions = regions.with_columns(pl.col("region_id").cast(pl.Utf8))

        # Standardize column names
        column_mapping = {
            "RegionID": "region_id_original",
            "RegionName": "region_name",
            "State": "state_code",
            "StateName": "state_name",
            "City": "city",
            "Metro": "metro",
            "CountyName": "county_name",
            "SizeRank": "size_rank",
        }

        rename_dict = {k: v for k, v in column_mapping.items() if k in regions.columns}
        regions = regions.rename(rename_dict)

        # Remove duplicates
        regions = regions.unique(subset=["region_id"])

        return regions

    def unpivot_values(
        self,
        df: pl.DataFrame,
        metadata: FileMetadata,
    ) -> pl.DataFrame:
        """
        Unpivot (melt) data from wide to long format.

        Input:
            RegionID | 2023-01 | 2023-02 | 2023-03

        Output:
            region_id | date | value | home_type | tier | ...
        """
        region_cols, date_cols = self.identify_columns(df)

        if not date_cols:
            raise ValueError("No date columns found in DataFrame")

        # Create region_id column
        if "RegionID" in df.columns:
            df = df.with_columns(
                pl.col("RegionID").cast(pl.Utf8).alias("region_id")
            )
        elif "RegionName" in df.columns:
            df = df.with_columns(
                pl.concat_str([
                    pl.col("RegionName").cast(pl.Utf8),
                    pl.lit("_"),
                    pl.col("State").cast(pl.Utf8).fill_null(""),
                ]).hash().cast(pl.Utf8).alias("region_id")
            )
        else:
            df = df.with_row_index("region_id")
            df = df.with_columns(pl.col("region_id").cast(pl.Utf8))

        # Unpivot
        long_df = df.unpivot(
            index=["region_id"],
            on=date_cols,
            variable_name="date",
            value_name="value",
        )

        # Convert date string to date type
        long_df = long_df.with_columns(
            pl.col("date").str.to_date(format="%Y-%m-%d").alias("date")
        )

        # Add metadata columns
        long_df = long_df.with_columns([
            pl.lit(metadata.geography_level).alias("geography_level"),
            pl.lit(metadata.home_type).alias("home_type"),
            pl.lit(metadata.tier).alias("tier"),
            pl.lit(metadata.smoothed).alias("smoothed"),
            pl.lit(metadata.seasonally_adjusted).alias("seasonally_adjusted"),
            pl.lit(metadata.frequency).alias("frequency"),
        ])

        if metadata.bedrooms is not None:
            long_df = long_df.with_columns(
                pl.lit(metadata.bedrooms).alias("bedrooms")
            )

        # Remove null values
        long_df = long_df.drop_nulls(subset=["value"])

        return long_df

    def process_file(self, file_path: Path) -> tuple[pl.DataFrame, pl.DataFrame]:
        """
        Process a single CSV file.

        Args:
            file_path: Path to CSV file

        Returns:
            Tuple of (regions_df, values_df)
        """
        metadata = self.extract_metadata(file_path.name)
        df = pl.read_csv(file_path, infer_schema_length=10000)

        regions_df = self.extract_regions(df, metadata.geography_level)
        values_df = self.unpivot_values(df, metadata)

        return regions_df, values_df

    def process_category(
        self,
        category: str,
    ) -> tuple[pl.DataFrame, pl.DataFrame]:
        """
        Process all files in a category subdirectory.

        Args:
            category: Category name (subdirectory)

        Returns:
            Tuple of (combined_regions, combined_values)
        """
        category_dir = self.input_dir / category
        if not category_dir.exists():
            raise FileNotFoundError(f"Category directory not found: {category_dir}")

        csv_files = list(category_dir.glob("*.csv"))
        if not csv_files:
            raise FileNotFoundError(f"No CSV files in {category_dir}")

        all_regions: list[pl.DataFrame] = []
        all_values: list[pl.DataFrame] = []

        for file_path in csv_files:
            try:
                regions_df, values_df = self.process_file(file_path)
                all_regions.append(regions_df)
                all_values.append(values_df)
            except Exception as e:
                print(f"Error processing {file_path.name}: {e}")
                continue

        # Combine with schema alignment
        combined_regions = self._combine_dataframes(all_regions, ["region_id"])
        combined_values = self._combine_dataframes(all_values, None)

        return combined_regions, combined_values

    def _combine_dataframes(
        self,
        dfs: list[pl.DataFrame],
        unique_subset: list[str] | None = None,
    ) -> pl.DataFrame:
        """
        Combine DataFrames with schema alignment.

        Args:
            dfs: List of DataFrames to combine
            unique_subset: Columns to use for deduplication

        Returns:
            Combined DataFrame
        """
        if not dfs:
            raise ValueError("No DataFrames to combine")

        # Collect all columns and their types
        all_columns: set[str] = set()
        column_types: dict[str, pl.DataType] = {}

        for df in dfs:
            all_columns.update(df.columns)
            for col in df.columns:
                dtype = df[col].dtype
                if col not in column_types and dtype != pl.Null or col in column_types and dtype != pl.Null and column_types[col] == pl.Null:
                    column_types[col] = dtype

        # Default types for unknown columns
        for col in all_columns:
            if col not in column_types or column_types[col] == pl.Null:
                column_types[col] = pl.Int64 if col == "bedrooms" else pl.Utf8

        # Align all DataFrames
        aligned: list[pl.DataFrame] = []
        for df in dfs:
            missing_cols = all_columns - set(df.columns)
            for col in missing_cols:
                df = df.with_columns(
                    pl.lit(None).cast(column_types[col]).alias(col)
                )

            for col in df.columns:
                if df[col].dtype != column_types[col]:
                    df = df.with_columns(pl.col(col).cast(column_types[col]))

            df = df.select(sorted(all_columns))
            aligned.append(df)

        combined = pl.concat(aligned)

        if unique_subset:
            combined = combined.unique(subset=unique_subset)

        return combined

    def save_to_parquet(
        self,
        regions_df: pl.DataFrame,
        values_df: pl.DataFrame,
        category: str,
    ) -> tuple[Path, Path]:
        """
        Save processed data to Parquet files.

        Args:
            regions_df: Regions DataFrame
            values_df: Values DataFrame
            category: Category name for file naming

        Returns:
            Tuple of (regions_path, values_path)
        """
        if not self.output_dir:
            raise ValueError("No output directory configured")

        regions_path = self.output_dir / f"{category}_regions.parquet"
        values_path = self.output_dir / f"{category}_values.parquet"

        regions_df.write_parquet(regions_path, compression="snappy")
        values_df.write_parquet(values_path, compression="snappy")

        return regions_path, values_path


def transform_zillow_category(
    input_dir: Path | str,
    category: str,
    output_dir: Path | str | None = None,
) -> tuple[pl.DataFrame, pl.DataFrame]:
    """
    Convenience function to transform a Zillow category.

    Args:
        input_dir: Directory containing raw CSV files
        category: Category to process
        output_dir: Optional directory for parquet output

    Returns:
        Tuple of (regions_df, values_df)
    """
    transformer = ZillowTransformer(
        input_dir=input_dir,
        output_dir=output_dir,
    )

    return transformer.process_category(category)

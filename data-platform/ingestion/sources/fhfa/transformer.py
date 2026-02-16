"""
FHFA HPI Data Transformer.

Transforms raw FHFA HPI master CSV into a normalized Parquet format.
Filters to purchase-only HPI for USA, State, and MSA levels.
"""

from __future__ import annotations

import logging
from pathlib import Path

import polars as pl

from .config import INCLUDED_FREQUENCIES, INCLUDED_HPI_TYPES, INCLUDED_LEVELS

logger = logging.getLogger(__name__)


class FHFATransformer:
    """Transform raw FHFA HPI CSV into normalized Parquet format."""

    def __init__(
        self,
        input_path: Path | str,
        output_dir: Path | str | None = None,
    ) -> None:
        """
        Initialize transformer.

        Args:
            input_path: Path to the raw hpi_master.csv file.
            output_dir: Optional directory for parquet output.
        """
        self.input_path = Path(input_path)
        self.output_dir = Path(output_dir) if output_dir else None

        if self.output_dir:
            self.output_dir.mkdir(parents=True, exist_ok=True)

    def transform(self) -> pl.DataFrame:
        """
        Transform the raw FHFA HPI CSV into normalized format.

        The master CSV has columns like:
        hpi_type, hpi_flavor, frequency, level, place_name, place_id,
        yr, period, index_nsa, index_sa

        We filter to:
        - hpi_type: purchase-only
        - frequency: monthly, quarterly
        - level: USA, State, MSA

        And normalize the date from yr+period into a proper date column.

        Returns:
            Normalized DataFrame with columns:
            level, place_name, place_id, date, index_nsa, index_sa,
            hpi_type, frequency
        """
        logger.info("Reading FHFA HPI master CSV: %s", self.input_path)
        df = pl.read_csv(self.input_path)

        logger.info("Raw FHFA HPI data: %d rows, %d columns", len(df), len(df.columns))

        # Normalize column names (strip whitespace)
        df = df.rename({col: col.strip() for col in df.columns})

        # Filter to relevant subset
        df_filtered = df.filter(
            pl.col("hpi_type").is_in(INCLUDED_HPI_TYPES)
            & pl.col("frequency").is_in(INCLUDED_FREQUENCIES)
            & pl.col("level").is_in(INCLUDED_LEVELS)
        )

        logger.info("After filtering: %d rows", len(df_filtered))

        # Build date from yr + period
        # For monthly: period = 1-12 (month number)
        # For quarterly: period = 1-4 (quarter number -> month 1,4,7,10)
        df_with_date = df_filtered.with_columns([
            pl.when(pl.col("frequency") == "monthly")
            .then(
                pl.concat_str([
                    pl.col("yr").cast(pl.Utf8),
                    pl.lit("-"),
                    pl.col("period").cast(pl.Utf8).str.zfill(2),
                    pl.lit("-01"),
                ])
            )
            .otherwise(
                pl.concat_str([
                    pl.col("yr").cast(pl.Utf8),
                    pl.lit("-"),
                    ((pl.col("period") - 1) * 3 + 1).cast(pl.Utf8).str.zfill(2),
                    pl.lit("-01"),
                ])
            )
            .str.to_date("%Y-%m-%d")
            .alias("date"),
        ])

        # Cast index columns to float
        df_normalized = df_with_date.with_columns([
            pl.col("index_nsa").cast(pl.Float64, strict=False),
            pl.col("index_sa").cast(pl.Float64, strict=False),
            pl.col("place_id").cast(pl.Utf8),
        ])

        # Select final columns
        result = df_normalized.select([
            pl.col("level"),
            pl.col("place_name"),
            pl.col("place_id"),
            pl.col("date"),
            pl.col("index_nsa"),
            pl.col("index_sa"),
            pl.col("hpi_type"),
            pl.col("frequency"),
        ])

        # Drop rows with no index values
        result = result.filter(
            pl.col("index_nsa").is_not_null() | pl.col("index_sa").is_not_null()
        )

        logger.info("Normalized FHFA HPI data: %d rows", len(result))

        return result

    def save_to_parquet(self, df: pl.DataFrame) -> Path:
        """
        Save transformed data to Parquet.

        Args:
            df: Transformed DataFrame.

        Returns:
            Path to the output Parquet file.

        Raises:
            ValueError: If no output directory is configured.
        """
        if not self.output_dir:
            raise ValueError("No output directory configured")

        output_path = self.output_dir / "fhfa_hpi.parquet"
        df.write_parquet(output_path, compression="snappy")
        logger.info("Saved FHFA HPI to: %s", output_path)
        return output_path


def transform_fhfa_data(
    input_path: Path | str,
    output_dir: Path | str | None = None,
) -> pl.DataFrame:
    """
    Convenience function to transform FHFA HPI data.

    Args:
        input_path: Path to the raw hpi_master.csv file.
        output_dir: Optional directory for parquet output.

    Returns:
        Normalized DataFrame.
    """
    transformer = FHFATransformer(
        input_path=input_path,
        output_dir=output_dir,
    )
    df = transformer.transform()
    if output_dir:
        transformer.save_to_parquet(df)
    return df

"""
Database Loading Assets.

Assets for loading transformed data into PostgreSQL.
"""

from pathlib import Path
from typing import Any

import polars as pl
from dagster import (
    AssetExecutionContext,
    AssetKey,
    MaterializeResult,
    MetadataValue,
    asset,
)

# Configuration
PROCESSED_DIR = Path("data/processed")


def get_postgres_connection_string() -> str:
    """Get PostgreSQL connection string from environment."""
    import os

    return os.getenv(
        "DATABASE_URL",
        "postgresql://housingiq:housingiq@localhost:5432/housingiq",
    )


@asset(
    group_name="database",
    description="Load ZHVI regions to PostgreSQL raw schema",
    deps=[AssetKey("zillow_zhvi_transformed")],
    compute_kind="postgres",
)
def raw_zhvi_regions(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load ZHVI regions to raw.zillow_regions table.
    """
    regions_path = PROCESSED_DIR / "zhvi_regions.parquet"

    if not regions_path.exists():
        context.log.warning(f"Regions file not found: {regions_path}")
        return MaterializeResult(
            metadata={"status": MetadataValue.text("no_data")}
        )

    df = pl.read_parquet(regions_path)

    # Load to PostgreSQL
    conn_str = get_postgres_connection_string()
    df.write_database(
        table_name="zillow_regions",
        connection=conn_str,
        if_table_exists="replace",
        engine="adbc",
    )

    context.log.info(f"Loaded {len(df)} regions to raw.zillow_regions")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df)),
            "columns": MetadataValue.json(df.columns),
        }
    )


@asset(
    group_name="database",
    description="Load ZHVI values to PostgreSQL raw schema",
    deps=[AssetKey("zillow_zhvi_transformed")],
    compute_kind="postgres",
)
def raw_zhvi_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load ZHVI values to raw.zillow_zhvi_values table.
    """
    values_path = PROCESSED_DIR / "zhvi_values.parquet"

    if not values_path.exists():
        context.log.warning(f"Values file not found: {values_path}")
        return MaterializeResult(
            metadata={"status": MetadataValue.text("no_data")}
        )

    df = pl.read_parquet(values_path)

    # Load to PostgreSQL
    conn_str = get_postgres_connection_string()
    df.write_database(
        table_name="zillow_zhvi_values",
        connection=conn_str,
        if_table_exists="replace",
        engine="adbc",
    )

    context.log.info(f"Loaded {len(df)} values to raw.zillow_zhvi_values")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df)),
            "date_range": MetadataValue.text(
                f"{df['date'].min()} to {df['date'].max()}"
            ),
        }
    )


@asset(
    group_name="database",
    description="Load ZORI values to PostgreSQL raw schema",
    deps=[AssetKey("zillow_zori_transformed")],
    compute_kind="postgres",
)
def raw_zori_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load ZORI values to raw.zillow_zori_values table.
    """
    values_path = PROCESSED_DIR / "zori_values.parquet"

    if not values_path.exists():
        context.log.warning(f"Values file not found: {values_path}")
        return MaterializeResult(
            metadata={"status": MetadataValue.text("no_data")}
        )

    df = pl.read_parquet(values_path)

    # Load to PostgreSQL
    conn_str = get_postgres_connection_string()
    df.write_database(
        table_name="zillow_zori_values",
        connection=conn_str,
        if_table_exists="replace",
        engine="adbc",
    )

    context.log.info(f"Loaded {len(df)} values to raw.zillow_zori_values")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df)),
            "date_range": MetadataValue.text(
                f"{df['date'].min()} to {df['date'].max()}"
            ),
        }
    )

"""
Database Loading Assets.

Assets for loading transformed data into PostgreSQL app schema.
Only final tables needed by the webapp are loaded to the database.
"""

import os
from pathlib import Path

import polars as pl
from dagster import (
    AssetExecutionContext,
    MaterializeResult,
    MetadataValue,
    asset,
)

# Configuration
PROCESSED_DIR = Path("data/processed")


def get_postgres_connection_string() -> str:
    """Get PostgreSQL connection string from environment."""
    return os.getenv(
        "DATABASE_URL",
        "postgresql://housingiq:housingiq@localhost:5432/housingiq",
    )


def ensure_app_schema() -> None:
    """Create app schema if it doesn't exist."""
    from sqlalchemy import create_engine, text

    engine = create_engine(get_postgres_connection_string())
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS app"))
        conn.commit()


def drop_and_create_table(table_name: str, df: pl.DataFrame) -> None:
    """Drop table if exists and create with new data."""
    from sqlalchemy import create_engine, text

    engine = create_engine(get_postgres_connection_string())
    with engine.connect() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {table_name} CASCADE"))
        conn.commit()

    # Write using Polars
    conn_str = get_postgres_connection_string()
    df.write_database(
        table_name=table_name,
        connection=conn_str,
        if_table_exists="replace",
        engine="adbc",
    )


@asset(
    group_name="app_database",
    description="Load regions to app.regions table",
    deps=["dim_regions"],
    compute_kind="postgres",
)
def app_regions(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load regions dimension to PostgreSQL for webapp.
    """
    regions_path = PROCESSED_DIR / "dim_regions.parquet"

    if not regions_path.exists():
        context.log.warning(f"Regions file not found: {regions_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    df = pl.read_parquet(regions_path)

    # Select and rename columns for webapp schema
    df_app = df.select([
        pl.col("region_id"),
        pl.col("region_name"),
        pl.col("display_name"),
        pl.col("geography_level"),
        pl.col("state_code").alias("state"),
        pl.col("state_name"),
        pl.col("city"),
        pl.col("county_name").alias("county"),
        pl.col("metro"),
        pl.col("size_rank"),
    ])

    ensure_app_schema()
    drop_and_create_table("app.regions", df_app)

    context.log.info(f"Loaded {len(df_app):,} regions to app.regions")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df_app)),
            "geography_levels": MetadataValue.json(
                df_app["geography_level"].unique().to_list()
            ),
        }
    )


@asset(
    group_name="app_database",
    description="Load ZHVI values to app.zhvi_values table",
    deps=["fct_zhvi_values"],
    compute_kind="postgres",
)
def app_zhvi_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load ZHVI fact table to PostgreSQL for webapp.
    """
    values_path = PROCESSED_DIR / "fct_zhvi_values.parquet"

    if not values_path.exists():
        context.log.warning(f"Values file not found: {values_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading ZHVI values...")
    df = pl.read_parquet(values_path)

    # Select columns for webapp schema
    df_app = df.select([
        pl.col("region_id"),
        pl.col("date"),
        pl.col("value"),
        pl.col("geography_level"),
        pl.col("home_type"),
        pl.col("tier"),
        pl.col("bedrooms"),
        pl.col("smoothed"),
        pl.col("seasonally_adjusted"),
        pl.col("frequency"),
        pl.col("mom_change_pct"),
        pl.col("yoy_change_pct"),
    ])

    ensure_app_schema()

    context.log.info(f"Loading {len(df_app):,} rows to app.zhvi_values...")
    drop_and_create_table("app.zhvi_values", df_app)

    context.log.info(f"Loaded {len(df_app):,} values to app.zhvi_values")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df_app)),
            "date_range": MetadataValue.text(
                f"{df_app['date'].min()} to {df_app['date'].max()}"
            ),
        }
    )


@asset(
    group_name="app_database",
    description="Load ZORI values to app.zori_values table",
    deps=["fct_zori_values"],
    compute_kind="postgres",
)
def app_zori_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load ZORI fact table to PostgreSQL for webapp.
    """
    values_path = PROCESSED_DIR / "fct_zori_values.parquet"

    if not values_path.exists():
        context.log.warning(f"Values file not found: {values_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading ZORI values...")
    df = pl.read_parquet(values_path)

    # Select columns for webapp schema
    df_app = df.select([
        pl.col("region_id"),
        pl.col("date"),
        pl.col("value"),
        pl.col("geography_level"),
        pl.col("home_type"),
        pl.col("smoothed"),
        pl.col("seasonally_adjusted"),
        pl.col("frequency"),
        pl.col("mom_change_pct"),
        pl.col("yoy_change_pct"),
    ])

    ensure_app_schema()

    context.log.info(f"Loading {len(df_app):,} rows to app.zori_values...")
    drop_and_create_table("app.zori_values", df_app)

    context.log.info(f"Loaded {len(df_app):,} values to app.zori_values")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df_app)),
            "date_range": MetadataValue.text(
                f"{df_app['date'].min()} to {df_app['date'].max()}"
            ),
        }
    )


@asset(
    group_name="app_database",
    description="Load market summary to app.market_summary table",
    deps=["market_summary"],
    compute_kind="postgres",
)
def app_market_summary(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load market summary to PostgreSQL for webapp dashboard.
    """
    summary_path = PROCESSED_DIR / "market_summary.parquet"

    if not summary_path.exists():
        context.log.warning(f"Summary file not found: {summary_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    df = pl.read_parquet(summary_path)

    ensure_app_schema()
    drop_and_create_table("app.market_summary", df)

    context.log.info(f"Loaded {len(df):,} market summaries to app.market_summary")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df)),
            "market_classifications": MetadataValue.json(
                df["market_classification"].value_counts().to_dicts()
            ),
        }
    )

"""
Database Loading Assets.

Assets for loading transformed data into PostgreSQL app schema.
Only final tables needed by the webapp are loaded to the database.
"""

import os

import polars as pl
from dagster import (
    AssetExecutionContext,
    MaterializeResult,
    MetadataValue,
    asset,
)

from ..metadata import build_column_lineage, polars_metadata
from ..paths import MART_DIR


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
    deps=["dimension_regions"],
    compute_kind="postgres",
)
def app_regions(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load regions dimension to PostgreSQL for webapp.
    """
    regions_path = MART_DIR / "dimension_regions.parquet"

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
        metadata=polars_metadata(
            df_app,
            include_date_range=False,
            extra={
                "geography_levels": MetadataValue.json(
                    df_app["geography_level"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    "region_id": [("dimension_regions", "region_id")],
                    "region_name": [("dimension_regions", "region_name")],
                    "display_name": [("dimension_regions", "display_name")],
                    "geography_level": [("dimension_regions", "geography_level")],
                    "state": [("dimension_regions", "state_code")],
                    "state_name": [("dimension_regions", "state_name")],
                    "city": [("dimension_regions", "city")],
                    "county": [("dimension_regions", "county_name")],
                    "metro": [("dimension_regions", "metro")],
                    "size_rank": [("dimension_regions", "size_rank")],
                }),
            },
        )
    )


@asset(
    group_name="app_database",
    description="Load ZHVI values to app.zhvi_values table",
    deps=["fact_zhvi_values"],
    compute_kind="postgres",
)
def app_zhvi_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load ZHVI fact table to PostgreSQL for webapp.
    """
    values_path = MART_DIR / "fact_zhvi_values.parquet"

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
        metadata=polars_metadata(
            df_app,
            extra={
                "dagster/column_lineage": build_column_lineage({
                    col: [("fact_zhvi_values", col)]
                    for col in df_app.columns
                }),
            },
        )
    )


@asset(
    group_name="app_database",
    description="Load ZORI values to app.zori_values table",
    deps=["fact_zori_values"],
    compute_kind="postgres",
)
def app_zori_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load ZORI fact table to PostgreSQL for webapp.
    """
    values_path = MART_DIR / "fact_zori_values.parquet"

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
        metadata=polars_metadata(
            df_app,
            extra={
                "dagster/column_lineage": build_column_lineage({
                    col: [("fact_zori_values", col)]
                    for col in df_app.columns
                }),
            },
        )
    )


@asset(
    group_name="app_database",
    description="Load market summary to app.market_summary table",
    deps=["aggregate_market_summary"],
    compute_kind="postgres",
)
def app_market_summary(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load market summary to PostgreSQL for webapp dashboard.
    """
    summary_path = MART_DIR / "market_summary.parquet"

    if not summary_path.exists():
        context.log.warning(f"Summary file not found: {summary_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    df = pl.read_parquet(summary_path)

    ensure_app_schema()
    drop_and_create_table("app.market_summary", df)

    context.log.info(f"Loaded {len(df):,} market summaries to app.market_summary")

    return MaterializeResult(
        metadata=polars_metadata(
            df,
            include_date_range=False,
            extra={
                "market_classifications": MetadataValue.json(
                    df["market_classification"].value_counts().to_dicts()
                ),
                "dagster/column_lineage": build_column_lineage({
                    col: [("aggregate_market_summary", col)]
                    for col in df.columns
                }),
            },
        )
    )


@asset(
    group_name="app_database",
    description="Load inventory values to app.inventory_values table",
    deps=["fact_inventory_values"],
    compute_kind="postgres",
)
def app_inventory_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load inventory fact table to PostgreSQL for webapp.
    """
    values_path = MART_DIR / "fact_inventory_values.parquet"

    if not values_path.exists():
        context.log.warning(f"Inventory file not found: {values_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading inventory values...")
    df = pl.read_parquet(values_path)

    # Select columns for webapp schema
    df_app = df.select([
        pl.col("region_id"),
        pl.col("date"),
        pl.col("inventory_count"),
        pl.col("geography_level"),
        pl.col("home_type"),
        pl.col("smoothed"),
        pl.col("frequency"),
        pl.col("mom_change_pct"),
        pl.col("yoy_change_pct"),
    ])

    ensure_app_schema()

    context.log.info(f"Loading {len(df_app):,} rows to app.inventory_values...")
    drop_and_create_table("app.inventory_values", df_app)

    context.log.info(f"Loaded {len(df_app):,} values to app.inventory_values")

    return MaterializeResult(
        metadata=polars_metadata(
            df_app,
            extra={
                "geography_levels": MetadataValue.json(
                    df_app["geography_level"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    col: [("fact_inventory_values", col)]
                    for col in df_app.columns
                }),
            },
        )
    )


@asset(
    group_name="app_database",
    description="Load market heat index to app.market_heat_index table",
    deps=["fact_market_heat_index"],
    compute_kind="postgres",
)
def app_market_heat_index(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load market heat index to PostgreSQL for webapp.
    """
    values_path = MART_DIR / "fact_market_heat_index.parquet"

    if not values_path.exists():
        context.log.warning(f"Market heat index file not found: {values_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading market heat index...")
    df = pl.read_parquet(values_path)

    # Select columns for webapp schema
    df_app = df.select([
        pl.col("region_id"),
        pl.col("date"),
        pl.col("heat_index"),
        pl.col("geography_level"),
        pl.col("mom_change"),
        pl.col("yoy_change"),
        pl.col("market_temperature"),
    ])

    ensure_app_schema()

    context.log.info(f"Loading {len(df_app):,} rows to app.market_heat_index...")
    drop_and_create_table("app.market_heat_index", df_app)

    context.log.info(f"Loaded {len(df_app):,} values to app.market_heat_index")

    return MaterializeResult(
        metadata=polars_metadata(
            df_app,
            extra={
                "geography_levels": MetadataValue.json(
                    df_app["geography_level"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    col: [("fact_market_heat_index", col)]
                    for col in df_app.columns
                }),
            },
        )
    )


@asset(
    group_name="app_database",
    description="Load affordability metrics to app.affordability_metrics table",
    deps=["fact_affordability_metrics"],
    compute_kind="postgres",
)
def app_affordability_metrics(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load affordability metrics to PostgreSQL for webapp.
    """
    values_path = MART_DIR / "fact_affordability_metrics.parquet"

    if not values_path.exists():
        context.log.warning(f"Affordability metrics file not found: {values_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading affordability metrics...")
    df = pl.read_parquet(values_path)

    # Select columns for webapp schema
    df_app = df.select([
        pl.col("region_id"),
        pl.col("date"),
        pl.col("value"),
        pl.col("geography_level"),
        pl.col("metric_type"),
        pl.col("down_payment_pct"),
        pl.col("mom_change_pct"),
        pl.col("yoy_change_pct"),
    ])

    ensure_app_schema()

    context.log.info(f"Loading {len(df_app):,} rows to app.affordability_metrics...")
    drop_and_create_table("app.affordability_metrics", df_app)

    context.log.info(f"Loaded {len(df_app):,} values to app.affordability_metrics")

    return MaterializeResult(
        metadata=polars_metadata(
            df_app,
            extra={
                "geography_levels": MetadataValue.json(
                    df_app["geography_level"].unique().to_list()
                ),
                "metric_types": MetadataValue.json(
                    df_app["metric_type"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    col: [("fact_affordability_metrics", col)]
                    for col in df_app.columns
                }),
            },
        )
    )


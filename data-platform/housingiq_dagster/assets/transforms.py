"""
Polars Transformation Assets.

High-performance data transformations using Polars instead of dbt.
All transforms run in-memory with parallel processing.
"""

from pathlib import Path

import polars as pl
from dagster import AssetExecutionContext, MaterializeResult, MetadataValue, asset

# Configuration
PROCESSED_DIR = Path("data/processed")


# Geography levels to include in transforms (exclude Zip/Neighborhood for memory)
INCLUDED_GEOGRAPHY_LEVELS = ["National", "State", "Metro", "County", "City"]


@asset(
    group_name="transforms",
    description="Transform ZHVI data with YoY/MoM calculations",
    deps=["zillow_zhvi_transformed"],
    compute_kind="polars",
)
def fct_zhvi_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Fact table for ZHVI values with derived metrics.

    Calculates:
    - Month-over-month change (value and %)
    - Year-over-year change (value and %)

    Note: Filters to State/Metro/County/City levels to keep memory usage manageable.
    """
    values_path = PROCESSED_DIR / "zhvi_values.parquet"

    if not values_path.exists():
        context.log.warning(f"Values file not found: {values_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading ZHVI values (filtering to dashboard-relevant geographies)...")
    df = pl.read_parquet(values_path).filter(
        pl.col("geography_level").is_in(INCLUDED_GEOGRAPHY_LEVELS)
    )

    context.log.info(f"Processing {len(df):,} rows with window functions...")

    # Partition columns for window functions
    partition_cols = ["region_id", "home_type", "tier", "bedrooms"]

    # Calculate lag values and derived metrics
    df_transformed = (
        df
        .sort(["region_id", "home_type", "tier", "bedrooms", "date"])
        .with_columns([
            # Previous month value
            pl.col("value")
            .shift(1)
            .over(partition_cols)
            .alias("prev_month_value"),

            # Previous year value (12 months ago)
            pl.col("value")
            .shift(12)
            .over(partition_cols)
            .alias("prev_year_value"),
        ])
        .with_columns([
            # Month-over-month change
            (pl.col("value") - pl.col("prev_month_value")).alias("mom_change_usd"),
            (
                (pl.col("value") - pl.col("prev_month_value"))
                / pl.col("prev_month_value")
                * 100
            ).round(2).alias("mom_change_pct"),

            # Year-over-year change
            (pl.col("value") - pl.col("prev_year_value")).alias("yoy_change_usd"),
            (
                (pl.col("value") - pl.col("prev_year_value"))
                / pl.col("prev_year_value")
                * 100
            ).round(2).alias("yoy_change_pct"),
        ])
    )

    # Save to parquet
    output_path = PROCESSED_DIR / "fct_zhvi_values.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df_transformed)),
            "columns": MetadataValue.json(df_transformed.columns),
            "date_range": MetadataValue.text(
                f"{df_transformed['date'].min()} to {df_transformed['date'].max()}"
            ),
        }
    )


@asset(
    group_name="transforms",
    description="Transform ZORI data with YoY/MoM calculations",
    deps=["zillow_zori_transformed"],
    compute_kind="polars",
)
def fct_zori_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Fact table for ZORI (rent) values with derived metrics.
    """
    values_path = PROCESSED_DIR / "zori_values.parquet"

    if not values_path.exists():
        context.log.warning(f"Values file not found: {values_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading ZORI values...")
    df = pl.read_parquet(values_path)

    context.log.info(f"Processing {len(df):,} rows with window functions...")

    # Partition columns for window functions
    partition_cols = ["region_id", "home_type"]

    # Calculate lag values and derived metrics
    df_transformed = (
        df
        .sort(["region_id", "home_type", "date"])
        .with_columns([
            # Previous month value
            pl.col("value")
            .shift(1)
            .over(partition_cols)
            .alias("prev_month_value"),

            # Previous year value (12 months ago)
            pl.col("value")
            .shift(12)
            .over(partition_cols)
            .alias("prev_year_value"),
        ])
        .with_columns([
            # Month-over-month change
            (pl.col("value") - pl.col("prev_month_value")).alias("mom_change_usd"),
            (
                (pl.col("value") - pl.col("prev_month_value"))
                / pl.col("prev_month_value")
                * 100
            ).round(2).alias("mom_change_pct"),

            # Year-over-year change
            (pl.col("value") - pl.col("prev_year_value")).alias("yoy_change_usd"),
            (
                (pl.col("value") - pl.col("prev_year_value"))
                / pl.col("prev_year_value")
                * 100
            ).round(2).alias("yoy_change_pct"),
        ])
    )

    # Save to parquet
    output_path = PROCESSED_DIR / "fct_zori_values.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df_transformed)),
            "columns": MetadataValue.json(df_transformed.columns),
            "date_range": MetadataValue.text(
                f"{df_transformed['date'].min()} to {df_transformed['date'].max()}"
            ),
        }
    )


@asset(
    group_name="transforms",
    description="Create dimension table for regions",
    deps=["zillow_zhvi_transformed"],
    compute_kind="polars",
)
def dim_regions(context: AssetExecutionContext) -> MaterializeResult:
    """
    Dimension table for geographic regions.

    Note: Filters to State/Metro/County/City levels for consistency.
    """
    regions_path = PROCESSED_DIR / "zhvi_regions.parquet"

    if not regions_path.exists():
        context.log.warning(f"Regions file not found: {regions_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading regions (filtering to dashboard-relevant geographies)...")
    df = pl.read_parquet(regions_path).filter(
        pl.col("geography_level").is_in(INCLUDED_GEOGRAPHY_LEVELS)
    )

    # Add display name based on geography level
    df_transformed = df.with_columns([
        pl.when(pl.col("geography_level") == "National")
        .then(pl.lit("United States"))
        .when(pl.col("geography_level") == "State")
        .then(pl.col("state_name"))
        .when(pl.col("geography_level") == "Metro")
        .then(pl.col("region_name") + pl.lit(" Metro Area"))
        .when(pl.col("geography_level") == "County")
        .then(pl.col("county_name") + pl.lit(", ") + pl.col("state_code"))
        .when(pl.col("geography_level") == "City")
        .then(pl.col("city") + pl.lit(", ") + pl.col("state_code"))
        .otherwise(pl.col("region_name"))
        .alias("display_name")
    ])

    # Save to parquet
    output_path = PROCESSED_DIR / "dim_regions.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} regions to {output_path}")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df_transformed)),
            "geography_levels": MetadataValue.json(
                df_transformed["geography_level"].unique().to_list()
            ),
        }
    )


@asset(
    group_name="transforms",
    description="Create market summary with latest values and metrics",
    deps=["fct_zhvi_values", "fct_zori_values", "dim_regions"],
    compute_kind="polars",
)
def market_summary(context: AssetExecutionContext) -> MaterializeResult:
    """
    Pre-computed market summary for the dashboard.

    Includes:
    - Latest home value and YoY change
    - Latest rent value and YoY change
    - Price-to-rent ratio
    - Market classification (Hot/Warm/Cold)
    """
    zhvi_path = PROCESSED_DIR / "fct_zhvi_values.parquet"
    zori_path = PROCESSED_DIR / "fct_zori_values.parquet"
    regions_path = PROCESSED_DIR / "dim_regions.parquet"

    for path in [zhvi_path, zori_path, regions_path]:
        if not path.exists():
            context.log.warning(f"Required file not found: {path}")
            return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading transformed data...")
    zhvi_df = pl.read_parquet(zhvi_path)
    zori_df = pl.read_parquet(zori_path)
    regions_df = pl.read_parquet(regions_path)

    context.log.info("Calculating latest ZHVI values...")
    # Get latest ZHVI values (All Homes, Mid-Tier, smoothed, seasonally adjusted)
    latest_zhvi = (
        zhvi_df
        .filter(
            (pl.col("home_type") == "All Homes") &
            (pl.col("tier") == "Mid-Tier") &
            pl.col("smoothed") &
            pl.col("seasonally_adjusted")
        )
        .sort(["region_id", "date"], descending=[False, True])
        .group_by("region_id")
        .first()
        .select([
            "region_id",
            pl.col("value").alias("current_home_value"),
            pl.col("yoy_change_pct").alias("home_value_yoy_pct"),
            pl.col("mom_change_pct").alias("home_value_mom_pct"),
            pl.col("date").alias("home_value_date"),
        ])
    )

    context.log.info("Calculating latest ZORI values...")
    # Get latest ZORI values
    latest_zori = (
        zori_df
        .filter(
            (pl.col("home_type") == "All Homes") &
            pl.col("smoothed") &
            pl.col("seasonally_adjusted")
        )
        .sort(["region_id", "date"], descending=[False, True])
        .group_by("region_id")
        .first()
        .select([
            "region_id",
            pl.col("value").alias("current_rent_value"),
            pl.col("yoy_change_pct").alias("rent_yoy_pct"),
            pl.col("mom_change_pct").alias("rent_mom_pct"),
            pl.col("date").alias("rent_value_date"),
        ])
    )

    context.log.info("Joining and calculating derived metrics...")
    # Join all data
    summary = (
        regions_df
        .select([
            "region_id",
            "region_name",
            "display_name",
            "geography_level",
            "state_code",
            "state_name",
            "metro",
            "size_rank",
        ])
        .join(latest_zhvi, on="region_id", how="left")
        .join(latest_zori, on="region_id", how="left")
        .with_columns([
            # Price-to-rent ratio
            (
                pl.col("current_home_value") / (pl.col("current_rent_value") * 12)
            ).round(2).alias("price_to_rent_ratio"),

            # Gross rent yield
            (
                (pl.col("current_rent_value") * 12) / pl.col("current_home_value") * 100
            ).round(2).alias("gross_rent_yield_pct"),

            # Market classification based on YoY home value change
            pl.when(pl.col("home_value_yoy_pct") > 10)
            .then(pl.lit("Hot"))
            .when(pl.col("home_value_yoy_pct") >= 3)
            .then(pl.lit("Warm"))
            .when(pl.col("home_value_yoy_pct").is_not_null())
            .then(pl.lit("Cold"))
            .otherwise(pl.lit("Unknown"))
            .alias("market_classification"),
        ])
        .filter(pl.col("current_home_value").is_not_null())
    )

    # Save to parquet
    output_path = PROCESSED_DIR / "market_summary.parquet"
    summary.write_parquet(output_path)

    context.log.info(f"Saved {len(summary):,} market summaries to {output_path}")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(summary)),
            "geography_levels": MetadataValue.json(
                summary["geography_level"].unique().to_list()
            ),
            "market_classifications": MetadataValue.json(
                summary["market_classification"].value_counts().to_dicts()
            ),
        }
    )

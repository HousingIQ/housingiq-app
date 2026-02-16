"""
Polars Transformation Assets.

High-performance data transformations using Polars instead of dbt.
All transforms run in-memory with parallel processing.

Business logic lives in ``transforms_logic`` -- these assets are thin
wrappers that handle file I/O and Dagster context.
"""

import polars as pl
from dagster import AssetExecutionContext, MaterializeResult, MetadataValue, asset

from ..metadata import build_column_lineage, polars_metadata
from ..paths import MART_DIR, RAW_DIR, STAGING_DIR
from ..transforms_logic import (
    INCLUDED_GEOGRAPHY_LEVELS,
    build_region_display_name,
    compute_heat_index_changes,
    compute_market_summary,
    compute_yoy_mom_changes,
    compute_yoy_mom_pct_only,
    parse_affordability_csv,
    parse_heat_index_csv,
    parse_inventory_csv,
)


@asset(
    group_name="transforms",
    description="Transform ZHVI data with YoY/MoM calculations",
    deps=["zillow_zhvi_transformed"],
    compute_kind="polars",
)
def fact_zhvi_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Fact table for ZHVI values with derived metrics.

    Calculates:
    - Month-over-month change (value and %)
    - Year-over-year change (value and %)

    Note: Filters to State/Metro/County/City levels to keep memory usage manageable.
    """
    values_path = STAGING_DIR / "zhvi_values.parquet"

    if not values_path.exists():
        context.log.warning(f"Values file not found: {values_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading ZHVI values (filtering to dashboard-relevant geographies)...")
    df = pl.read_parquet(values_path).filter(
        pl.col("geography_level").is_in(INCLUDED_GEOGRAPHY_LEVELS)
    )

    context.log.info(f"Processing {len(df):,} rows with window functions...")

    df_transformed = compute_yoy_mom_changes(
        df,
        partition_cols=["region_id", "home_type", "tier", "bedrooms"],
        sort_cols=["region_id", "home_type", "tier", "bedrooms", "date"],
    )

    # Save to parquet
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fact_zhvi_values.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata=polars_metadata(
            df_transformed,
            extra={
                "dagster/column_lineage": build_column_lineage({
                    "region_id": [("zillow_zhvi_transformed", "region_id")],
                    "date": [("zillow_zhvi_transformed", "date")],
                    "value": [("zillow_zhvi_transformed", "value")],
                    "geography_level": [("zillow_zhvi_transformed", "geography_level")],
                    "home_type": [("zillow_zhvi_transformed", "home_type")],
                    "tier": [("zillow_zhvi_transformed", "tier")],
                    "bedrooms": [("zillow_zhvi_transformed", "bedrooms")],
                    "smoothed": [("zillow_zhvi_transformed", "smoothed")],
                    "seasonally_adjusted": [("zillow_zhvi_transformed", "seasonally_adjusted")],
                    "frequency": [("zillow_zhvi_transformed", "frequency")],
                    "mom_change_pct": [("zillow_zhvi_transformed", "value")],
                    "yoy_change_pct": [("zillow_zhvi_transformed", "value")],
                    "mom_change_usd": [("zillow_zhvi_transformed", "value")],
                    "yoy_change_usd": [("zillow_zhvi_transformed", "value")],
                }),
            },
        )
    )


@asset(
    group_name="transforms",
    description="Transform ZORI data with YoY/MoM calculations",
    deps=["zillow_zori_transformed"],
    compute_kind="polars",
)
def fact_zori_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Fact table for ZORI (rent) values with derived metrics.
    """
    values_path = STAGING_DIR / "zori_values.parquet"

    if not values_path.exists():
        context.log.warning(f"Values file not found: {values_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading ZORI values...")
    df = pl.read_parquet(values_path)

    context.log.info(f"Processing {len(df):,} rows with window functions...")

    df_transformed = compute_yoy_mom_changes(
        df,
        partition_cols=["region_id", "home_type"],
        sort_cols=["region_id", "home_type", "date"],
    )

    # Save to parquet
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fact_zori_values.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata=polars_metadata(
            df_transformed,
            extra={
                "dagster/column_lineage": build_column_lineage({
                    "region_id": [("zillow_zori_transformed", "region_id")],
                    "date": [("zillow_zori_transformed", "date")],
                    "value": [("zillow_zori_transformed", "value")],
                    "geography_level": [("zillow_zori_transformed", "geography_level")],
                    "home_type": [("zillow_zori_transformed", "home_type")],
                    "smoothed": [("zillow_zori_transformed", "smoothed")],
                    "seasonally_adjusted": [("zillow_zori_transformed", "seasonally_adjusted")],
                    "frequency": [("zillow_zori_transformed", "frequency")],
                    "mom_change_pct": [("zillow_zori_transformed", "value")],
                    "yoy_change_pct": [("zillow_zori_transformed", "value")],
                    "mom_change_usd": [("zillow_zori_transformed", "value")],
                    "yoy_change_usd": [("zillow_zori_transformed", "value")],
                }),
            },
        )
    )


@asset(
    group_name="transforms",
    description="Create dimension table for regions",
    deps=["zillow_zhvi_transformed"],
    compute_kind="polars",
)
def dimension_regions(context: AssetExecutionContext) -> MaterializeResult:
    """
    Dimension table for geographic regions.

    Note: Filters to State/Metro/County/City levels for consistency.
    """
    regions_path = STAGING_DIR / "zhvi_regions.parquet"

    if not regions_path.exists():
        context.log.warning(f"Regions file not found: {regions_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading regions (filtering to dashboard-relevant geographies)...")
    df = pl.read_parquet(regions_path).filter(
        pl.col("geography_level").is_in(INCLUDED_GEOGRAPHY_LEVELS)
    )

    df_transformed = build_region_display_name(df)

    # Save to parquet
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "dimension_regions.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} regions to {output_path}")

    return MaterializeResult(
        metadata=polars_metadata(
            df_transformed,
            include_date_range=False,
            extra={
                "geography_levels": MetadataValue.json(
                    df_transformed["geography_level"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    "region_id": [("zillow_zhvi_transformed", "region_id")],
                    "region_name": [("zillow_zhvi_transformed", "region_name")],
                    "geography_level": [("zillow_zhvi_transformed", "geography_level")],
                    "state_code": [("zillow_zhvi_transformed", "state_code")],
                    "state_name": [("zillow_zhvi_transformed", "state_name")],
                    "city": [("zillow_zhvi_transformed", "city")],
                    "county_name": [("zillow_zhvi_transformed", "county_name")],
                    "metro": [("zillow_zhvi_transformed", "metro")],
                    "size_rank": [("zillow_zhvi_transformed", "size_rank")],
                    "display_name": [
                        ("zillow_zhvi_transformed", "geography_level"),
                        ("zillow_zhvi_transformed", "region_name"),
                        ("zillow_zhvi_transformed", "state_name"),
                        ("zillow_zhvi_transformed", "state_code"),
                        ("zillow_zhvi_transformed", "county_name"),
                        ("zillow_zhvi_transformed", "city"),
                    ],
                }),
            },
        )
    )


@asset(
    group_name="transforms",
    description="Create market summary with latest values and metrics",
    deps=["fact_zhvi_values", "fact_zori_values", "dimension_regions"],
    compute_kind="polars",
)
def aggregate_market_summary(context: AssetExecutionContext) -> MaterializeResult:
    """
    Pre-computed market summary for the dashboard.

    Includes:
    - Latest home value and YoY change
    - Latest rent value and YoY change
    - Price-to-rent ratio
    - Market classification (Hot/Warm/Cold)
    """
    zhvi_path = MART_DIR / "fact_zhvi_values.parquet"
    zori_path = MART_DIR / "fact_zori_values.parquet"
    regions_path = MART_DIR / "dimension_regions.parquet"

    for path in [zhvi_path, zori_path, regions_path]:
        if not path.exists():
            context.log.warning(f"Required file not found: {path}")
            return MaterializeResult(metadata={"status": "no_data"})

    context.log.info("Reading transformed data...")
    zhvi_df = pl.read_parquet(zhvi_path)
    zori_df = pl.read_parquet(zori_path)
    regions_df = pl.read_parquet(regions_path)

    context.log.info("Computing market summary...")
    summary = compute_market_summary(zhvi_df, zori_df, regions_df)

    # Save to parquet
    output_path = MART_DIR / "market_summary.parquet"
    summary.write_parquet(output_path)

    context.log.info(f"Saved {len(summary):,} market summaries to {output_path}")

    return MaterializeResult(
        metadata=polars_metadata(
            summary,
            include_date_range=False,
            extra={
                "geography_levels": MetadataValue.json(
                    summary["geography_level"].unique().to_list()
                ),
                "market_classifications": MetadataValue.json(
                    summary["market_classification"].value_counts().to_dicts()
                ),
                "dagster/column_lineage": build_column_lineage({
                    "region_id": [("dimension_regions", "region_id")],
                    "region_name": [("dimension_regions", "region_name")],
                    "display_name": [("dimension_regions", "display_name")],
                    "geography_level": [("dimension_regions", "geography_level")],
                    "state_code": [("dimension_regions", "state_code")],
                    "state_name": [("dimension_regions", "state_name")],
                    "metro": [("dimension_regions", "metro")],
                    "size_rank": [("dimension_regions", "size_rank")],
                    "current_home_value": [("fact_zhvi_values", "value")],
                    "home_value_yoy_pct": [("fact_zhvi_values", "yoy_change_pct")],
                    "home_value_mom_pct": [("fact_zhvi_values", "mom_change_pct")],
                    "home_value_date": [("fact_zhvi_values", "date")],
                    "current_rent_value": [("fact_zori_values", "value")],
                    "rent_yoy_pct": [("fact_zori_values", "yoy_change_pct")],
                    "rent_mom_pct": [("fact_zori_values", "mom_change_pct")],
                    "rent_value_date": [("fact_zori_values", "date")],
                    "price_to_rent_ratio": [
                        ("fact_zhvi_values", "value"),
                        ("fact_zori_values", "value"),
                    ],
                    "gross_rent_yield_pct": [
                        ("fact_zori_values", "value"),
                        ("fact_zhvi_values", "value"),
                    ],
                    "market_classification": [("fact_zhvi_values", "yoy_change_pct")],
                }),
            },
        )
    )


@asset(
    group_name="transforms",
    description="Transform Inventory data with YoY/MoM calculations",
    deps=["zillow_raw_files"],
    compute_kind="polars",
)
def fact_inventory_values(context: AssetExecutionContext) -> MaterializeResult:
    """
    Fact table for for-sale inventory values with derived metrics.

    Reads raw inventory CSV files and transforms them into a normalized format.
    """
    invt_dir = RAW_DIR / "invt_fs"

    if not invt_dir.exists():
        context.log.warning(f"Inventory directory not found: {invt_dir}")
        return MaterializeResult(metadata={"status": "no_data"})

    # Find monthly smoothed files
    csv_files = list(invt_dir.glob("*_invt_fs_*_sm_month.csv"))
    if not csv_files:
        context.log.warning("No monthly smoothed inventory files found")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info(f"Processing {len(csv_files)} inventory files...")

    all_dfs: list[pl.DataFrame] = []

    for file_path in csv_files:
        context.log.info(f"Reading {file_path.name}...")
        df = pl.read_csv(file_path)
        parsed = parse_inventory_csv(df, file_path.name)
        if parsed is not None:
            all_dfs.append(parsed)
        else:
            context.log.warning(f"No date columns found in {file_path.name}")

    if not all_dfs:
        context.log.warning("No data processed from inventory files")
        return MaterializeResult(metadata={"status": "no_data"})

    # Combine, filter nulls, and compute changes
    combined = (
        pl.concat(all_dfs)
        .filter(pl.col("inventory_count").is_not_null())
        .sort(["region_id", "home_type", "date"])
    )

    df_transformed = compute_yoy_mom_pct_only(
        combined,
        partition_cols=["region_id", "home_type"],
        sort_cols=["region_id", "home_type", "date"],
        value_col="inventory_count",
    )

    # Save to parquet
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fact_inventory_values.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata=polars_metadata(
            df_transformed,
            extra={
                "geography_levels": MetadataValue.json(
                    df_transformed["geography_level"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    "region_id": [("zillow_raw_files", "RegionID")],
                    "date": [("zillow_raw_files", "date")],
                    "inventory_count": [("zillow_raw_files", "inventory_count")],
                    "geography_level": [("zillow_raw_files", "RegionType")],
                    "home_type": [("zillow_raw_files", "home_type")],
                    "smoothed": [("zillow_raw_files", "smoothed")],
                    "frequency": [("zillow_raw_files", "frequency")],
                    "mom_change_pct": [("zillow_raw_files", "inventory_count")],
                    "yoy_change_pct": [("zillow_raw_files", "inventory_count")],
                }),
            },
        )
    )


@asset(
    group_name="transforms",
    description="Transform Market Heat Index data with YoY/MoM trends",
    deps=["zillow_raw_files"],
    compute_kind="polars",
)
def fact_market_heat_index(context: AssetExecutionContext) -> MaterializeResult:
    """
    Fact table for Market Heat Index (0-100 scale).

    Reads raw market_temp_index CSV files and transforms them into a normalized format
    with YoY and MoM change calculations.
    """
    heat_dir = RAW_DIR / "market_temp_index"

    if not heat_dir.exists():
        context.log.warning(f"Market Heat Index directory not found: {heat_dir}")
        return MaterializeResult(metadata={"status": "no_data"})

    csv_files = list(heat_dir.glob("*.csv"))
    if not csv_files:
        context.log.warning("No market heat index files found")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info(f"Processing {len(csv_files)} market heat index files...")

    all_dfs: list[pl.DataFrame] = []

    for file_path in csv_files:
        context.log.info(f"Reading {file_path.name}...")
        df = pl.read_csv(file_path)
        parsed = parse_heat_index_csv(df, file_path.name)
        if parsed is not None:
            all_dfs.append(parsed)
        else:
            context.log.warning(f"No date columns found in {file_path.name}")

    if not all_dfs:
        context.log.warning("No data processed from market heat index files")
        return MaterializeResult(metadata={"status": "no_data"})

    # Combine, filter nulls, and compute changes
    combined = (
        pl.concat(all_dfs)
        .filter(pl.col("heat_index").is_not_null())
        .sort(["region_id", "date"])
    )

    df_transformed = compute_heat_index_changes(
        combined,
        partition_cols=["region_id"],
        sort_cols=["region_id", "date"],
    )

    # Save to parquet
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fact_market_heat_index.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata=polars_metadata(
            df_transformed,
            extra={
                "geography_levels": MetadataValue.json(
                    df_transformed["geography_level"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    "region_id": [("zillow_raw_files", "RegionID")],
                    "date": [("zillow_raw_files", "date")],
                    "heat_index": [("zillow_raw_files", "heat_index")],
                    "geography_level": [("zillow_raw_files", "RegionType")],
                    "mom_change": [("zillow_raw_files", "heat_index")],
                    "yoy_change": [("zillow_raw_files", "heat_index")],
                    "market_temperature": [("zillow_raw_files", "heat_index")],
                }),
            },
        )
    )


@asset(
    group_name="transforms",
    description="Transform affordability metrics (mortgage payments, income needed)",
    deps=["zillow_raw_files"],
    compute_kind="polars",
)
def fact_affordability_metrics(context: AssetExecutionContext) -> MaterializeResult:
    """
    Fact table for affordability metrics.

    Combines:
    - Mortgage payments (5%, 10%, 20% down payment)
    - Total monthly payments
    - New homeowner income needed
    - New renter income needed
    """
    categories = [
        ("mortgage_payment", "mortgage_payment"),
        ("total_monthly_payment", "total_monthly_payment"),
        ("new_homeowner_income_needed", "homeowner_income_needed"),
        ("new_renter_income_needed", "renter_income_needed"),
    ]

    all_dfs: list[pl.DataFrame] = []

    for category_dir, metric_type in categories:
        cat_path = RAW_DIR / category_dir

        if not cat_path.exists():
            context.log.warning(f"Category directory not found: {cat_path}")
            continue

        csv_files = list(cat_path.glob("*.csv"))
        if not csv_files:
            context.log.warning(f"No CSV files in {cat_path}")
            continue

        context.log.info(f"Processing {len(csv_files)} files from {category_dir}...")

        for file_path in csv_files:
            context.log.info(f"Reading {file_path.name}...")
            df = pl.read_csv(file_path)
            parsed = parse_affordability_csv(df, file_path.name, metric_type)
            if parsed is not None:
                all_dfs.append(parsed)
            else:
                context.log.warning(f"No date columns found in {file_path.name}")

    if not all_dfs:
        context.log.warning("No affordability data processed")
        return MaterializeResult(metadata={"status": "no_data"})

    # Combine, filter nulls, and compute changes
    combined = (
        pl.concat(all_dfs)
        .filter(pl.col("value").is_not_null())
        .sort(["region_id", "metric_type", "down_payment_pct", "date"])
    )

    df_transformed = compute_yoy_mom_pct_only(
        combined,
        partition_cols=["region_id", "metric_type", "down_payment_pct"],
        sort_cols=["region_id", "metric_type", "down_payment_pct", "date"],
    )

    # Save to parquet
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fact_affordability_metrics.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata=polars_metadata(
            df_transformed,
            extra={
                "geography_levels": MetadataValue.json(
                    df_transformed["geography_level"].unique().to_list()
                ),
                "metric_types": MetadataValue.json(
                    df_transformed["metric_type"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    "region_id": [("zillow_raw_files", "RegionID")],
                    "date": [("zillow_raw_files", "date")],
                    "value": [("zillow_raw_files", "value")],
                    "geography_level": [("zillow_raw_files", "RegionType")],
                    "metric_type": [("zillow_raw_files", "metric_type")],
                    "down_payment_pct": [("zillow_raw_files", "down_payment_pct")],
                    "mom_change_pct": [("zillow_raw_files", "value")],
                    "yoy_change_pct": [("zillow_raw_files", "value")],
                }),
            },
        )
    )

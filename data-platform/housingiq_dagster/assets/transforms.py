"""
Polars Transformation Assets.

High-performance data transformations using Polars instead of dbt.
All transforms run in-memory with parallel processing.
"""

import polars as pl
from dagster import AssetExecutionContext, MaterializeResult, MetadataValue, asset

from ..paths import RAW_DIR, STAGING_DIR, MART_DIR


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
    values_path = STAGING_DIR / "zhvi_values.parquet"

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
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fct_zhvi_values.parquet"
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
    values_path = STAGING_DIR / "zori_values.parquet"

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
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fct_zori_values.parquet"
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
    regions_path = STAGING_DIR / "zhvi_regions.parquet"

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
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "dim_regions.parquet"
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
    zhvi_path = MART_DIR / "fct_zhvi_values.parquet"
    zori_path = MART_DIR / "fct_zori_values.parquet"
    regions_path = MART_DIR / "dim_regions.parquet"

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
    output_path = MART_DIR / "market_summary.parquet"
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


@asset(
    group_name="transforms",
    description="Transform Inventory data with YoY/MoM calculations",
    deps=["zillow_raw_files"],
    compute_kind="polars",
)
def fct_inventory_values(context: AssetExecutionContext) -> MaterializeResult:
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

    all_dfs = []

    for file_path in csv_files:
        context.log.info(f"Reading {file_path.name}...")

        # Read CSV
        df = pl.read_csv(file_path)

        # Extract geography level from filename
        filename = file_path.name
        if filename.startswith("Metro_"):
            geo_level = "Metro"
        elif filename.startswith("State_"):
            geo_level = "State"
        elif filename.startswith("County_"):
            geo_level = "County"
        elif filename.startswith("City_"):
            geo_level = "City"
        elif filename.startswith("Zip_"):
            geo_level = "Zip"
        else:
            geo_level = "Unknown"

        # Determine home type from filename
        if "_sfrcondo_" in filename:
            home_type = "All Homes"
        elif "_sfr_" in filename:
            home_type = "Single Family"
        elif "_condo_" in filename:
            home_type = "Condo"
        else:
            home_type = "All Homes"

        # Determine if smoothed
        is_smoothed = "_sm_" in filename

        # Get metadata columns
        meta_cols = []
        for col in ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName"]:
            if col in df.columns:
                meta_cols.append(col)

        # Get date columns (YYYY-MM-DD format)
        date_cols = [c for c in df.columns if c not in meta_cols and c[0].isdigit()]

        if not date_cols:
            context.log.warning(f"No date columns found in {file_path.name}")
            continue

        # Melt to long format
        melted = df.unpivot(
            index=meta_cols,
            on=date_cols,
            variable_name="date",
            value_name="inventory_count",
        )

        # Add metadata columns
        melted = melted.with_columns([
            pl.col("RegionID").cast(pl.Utf8).alias("region_id"),
            pl.lit(geo_level).alias("geography_level"),
            pl.lit(home_type).alias("home_type"),
            pl.lit(is_smoothed).alias("smoothed"),
            pl.lit("monthly").alias("frequency"),
            pl.col("inventory_count").cast(pl.Int64),
        ])

        # Select final columns
        final_cols = [
            "region_id",
            "date",
            "inventory_count",
            "geography_level",
            "home_type",
            "smoothed",
            "frequency",
        ]

        all_dfs.append(melted.select(final_cols))

    if not all_dfs:
        context.log.warning("No data processed from inventory files")
        return MaterializeResult(metadata={"status": "no_data"})

    # Combine all dataframes
    combined = pl.concat(all_dfs)

    # Remove nulls and sort
    combined = combined.filter(
        pl.col("inventory_count").is_not_null()
    ).sort(["region_id", "home_type", "date"])

    # Calculate MoM and YoY changes
    partition_cols = ["region_id", "home_type"]

    df_transformed = (
        combined
        .with_columns([
            pl.col("inventory_count")
            .shift(1)
            .over(partition_cols)
            .alias("prev_month"),

            pl.col("inventory_count")
            .shift(12)
            .over(partition_cols)
            .alias("prev_year"),
        ])
        .with_columns([
            (
                (pl.col("inventory_count").cast(pl.Float64) - pl.col("prev_month").cast(pl.Float64))
                / pl.col("prev_month").cast(pl.Float64)
                * 100
            ).round(2).alias("mom_change_pct"),

            (
                (pl.col("inventory_count").cast(pl.Float64) - pl.col("prev_year").cast(pl.Float64))
                / pl.col("prev_year").cast(pl.Float64)
                * 100
            ).round(2).alias("yoy_change_pct"),
        ])
        .drop(["prev_month", "prev_year"])
    )

    # Save to parquet
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fct_inventory_values.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df_transformed)),
            "columns": MetadataValue.json(df_transformed.columns),
            "geography_levels": MetadataValue.json(
                df_transformed["geography_level"].unique().to_list()
            ),
            "date_range": MetadataValue.text(
                f"{df_transformed['date'].min()} to {df_transformed['date'].max()}"
            ),
        }
    )


@asset(
    group_name="transforms",
    description="Transform Market Heat Index data with YoY/MoM trends",
    deps=["zillow_raw_files"],
    compute_kind="polars",
)
def fct_market_heat_index(context: AssetExecutionContext) -> MaterializeResult:
    """
    Fact table for Market Heat Index (0-100 scale).

    Reads raw market_temp_index CSV files and transforms them into a normalized format
    with YoY and MoM change calculations.
    """
    import re

    heat_dir = RAW_DIR / "market_temp_index"

    if not heat_dir.exists():
        context.log.warning(f"Market Heat Index directory not found: {heat_dir}")
        return MaterializeResult(metadata={"status": "no_data"})

    csv_files = list(heat_dir.glob("*.csv"))
    if not csv_files:
        context.log.warning("No market heat index files found")
        return MaterializeResult(metadata={"status": "no_data"})

    context.log.info(f"Processing {len(csv_files)} market heat index files...")

    all_dfs = []

    for file_path in csv_files:
        context.log.info(f"Reading {file_path.name}...")

        df = pl.read_csv(file_path)

        # Extract geography level from filename
        filename = file_path.name
        if filename.startswith("Metro_"):
            geo_level = "Metro"
        elif filename.startswith("State_"):
            geo_level = "State"
        elif filename.startswith("County_"):
            geo_level = "County"
        elif filename.startswith("Zip_"):
            geo_level = "Zip"
        else:
            geo_level = "National"

        # Identify columns
        meta_cols = []
        for col in ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName"]:
            if col in df.columns:
                meta_cols.append(col)

        # Get date columns (YYYY-MM-DD format)
        date_cols = [c for c in df.columns if c not in meta_cols and re.match(r"^\d{4}-\d{2}-\d{2}$", c)]

        if not date_cols:
            context.log.warning(f"No date columns found in {file_path.name}")
            continue

        # Melt to long format
        melted = df.unpivot(
            index=meta_cols,
            on=date_cols,
            variable_name="date",
            value_name="heat_index",
        )

        # Add metadata columns
        melted = melted.with_columns([
            pl.col("RegionID").cast(pl.Utf8).alias("region_id"),
            pl.lit(geo_level).alias("geography_level"),
            pl.col("heat_index").cast(pl.Float64),
        ])

        # Select final columns
        final_cols = [
            "region_id",
            "date",
            "heat_index",
            "geography_level",
        ]

        all_dfs.append(melted.select(final_cols))

    if not all_dfs:
        context.log.warning("No data processed from market heat index files")
        return MaterializeResult(metadata={"status": "no_data"})

    # Combine all dataframes
    combined = pl.concat(all_dfs)

    # Remove nulls and sort
    combined = combined.filter(
        pl.col("heat_index").is_not_null()
    ).sort(["region_id", "date"])

    # Calculate MoM and YoY changes
    partition_cols = ["region_id"]

    df_transformed = (
        combined
        .with_columns([
            pl.col("heat_index")
            .shift(1)
            .over(partition_cols)
            .alias("prev_month"),

            pl.col("heat_index")
            .shift(12)
            .over(partition_cols)
            .alias("prev_year"),
        ])
        .with_columns([
            (pl.col("heat_index") - pl.col("prev_month")).round(2).alias("mom_change"),
            (pl.col("heat_index") - pl.col("prev_year")).round(2).alias("yoy_change"),

            # Market classification based on heat index
            pl.when(pl.col("heat_index") >= 80)
            .then(pl.lit("Hot"))
            .when(pl.col("heat_index") >= 60)
            .then(pl.lit("Warm"))
            .when(pl.col("heat_index") >= 40)
            .then(pl.lit("Balanced"))
            .when(pl.col("heat_index") >= 20)
            .then(pl.lit("Cool"))
            .otherwise(pl.lit("Cold"))
            .alias("market_temperature"),
        ])
        .drop(["prev_month", "prev_year"])
    )

    # Save to parquet
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fct_market_heat_index.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df_transformed)),
            "columns": MetadataValue.json(df_transformed.columns),
            "geography_levels": MetadataValue.json(
                df_transformed["geography_level"].unique().to_list()
            ),
            "date_range": MetadataValue.text(
                f"{df_transformed['date'].min()} to {df_transformed['date'].max()}"
            ),
        }
    )


@asset(
    group_name="transforms",
    description="Transform affordability metrics (mortgage payments, income needed)",
    deps=["zillow_raw_files"],
    compute_kind="polars",
)
def fct_affordability_metrics(context: AssetExecutionContext) -> MaterializeResult:
    """
    Fact table for affordability metrics.

    Combines:
    - Mortgage payments (5%, 10%, 20% down payment)
    - Total monthly payments
    - New homeowner income needed
    - New renter income needed
    """
    import re

    categories = [
        ("mortgage_payment", "mortgage_payment"),
        ("total_monthly_payment", "total_monthly_payment"),
        ("new_homeowner_income_needed", "homeowner_income_needed"),
        ("new_renter_income_needed", "renter_income_needed"),
    ]

    all_dfs = []

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
            filename = file_path.name

            # Extract geography level
            if filename.startswith("Metro_"):
                geo_level = "Metro"
            elif filename.startswith("State_"):
                geo_level = "State"
            elif filename.startswith("County_"):
                geo_level = "County"
            elif filename.startswith("Zip_"):
                geo_level = "Zip"
            else:
                geo_level = "National"

            # Extract down payment percentage from filename
            down_payment_match = re.search(r"downpayment_(\d+\.\d+)", filename)
            down_payment_pct = float(down_payment_match.group(1)) * 100 if down_payment_match else None

            # Identify columns
            meta_cols = []
            for col in ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName"]:
                if col in df.columns:
                    meta_cols.append(col)

            # Get date columns
            date_cols = [c for c in df.columns if c not in meta_cols and re.match(r"^\d{4}-\d{2}-\d{2}$", c)]

            if not date_cols:
                context.log.warning(f"No date columns found in {file_path.name}")
                continue

            # Melt to long format
            melted = df.unpivot(
                index=meta_cols,
                on=date_cols,
                variable_name="date",
                value_name="value",
            )

            # Add metadata columns
            melted = melted.with_columns([
                pl.col("RegionID").cast(pl.Utf8).alias("region_id"),
                pl.lit(geo_level).alias("geography_level"),
                pl.lit(metric_type).alias("metric_type"),
                pl.lit(down_payment_pct).alias("down_payment_pct"),
                pl.col("value").cast(pl.Float64),
            ])

            # Select final columns
            final_cols = [
                "region_id",
                "date",
                "value",
                "geography_level",
                "metric_type",
                "down_payment_pct",
            ]

            all_dfs.append(melted.select(final_cols))

    if not all_dfs:
        context.log.warning("No affordability data processed")
        return MaterializeResult(metadata={"status": "no_data"})

    # Combine all dataframes
    combined = pl.concat(all_dfs)

    # Remove nulls and sort
    combined = combined.filter(
        pl.col("value").is_not_null()
    ).sort(["region_id", "metric_type", "down_payment_pct", "date"])

    # Calculate MoM and YoY changes
    partition_cols = ["region_id", "metric_type", "down_payment_pct"]

    df_transformed = (
        combined
        .with_columns([
            pl.col("value")
            .shift(1)
            .over(partition_cols)
            .alias("prev_month"),

            pl.col("value")
            .shift(12)
            .over(partition_cols)
            .alias("prev_year"),
        ])
        .with_columns([
            (
                (pl.col("value") - pl.col("prev_month"))
                / pl.col("prev_month")
                * 100
            ).round(2).alias("mom_change_pct"),

            (
                (pl.col("value") - pl.col("prev_year"))
                / pl.col("prev_year")
                * 100
            ).round(2).alias("yoy_change_pct"),
        ])
        .drop(["prev_month", "prev_year"])
    )

    # Save to parquet
    MART_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MART_DIR / "fct_affordability_metrics.parquet"
    df_transformed.write_parquet(output_path)

    context.log.info(f"Saved {len(df_transformed):,} rows to {output_path}")

    return MaterializeResult(
        metadata={
            "row_count": MetadataValue.int(len(df_transformed)),
            "columns": MetadataValue.json(df_transformed.columns),
            "geography_levels": MetadataValue.json(
                df_transformed["geography_level"].unique().to_list()
            ),
            "metric_types": MetadataValue.json(
                df_transformed["metric_type"].unique().to_list()
            ),
            "date_range": MetadataValue.text(
                f"{df_transformed['date'].min()} to {df_transformed['date'].max()}"
            ),
        }
    )


"""
Pure Polars Transformation Logic.

All functions are pure: DataFrame in, DataFrame out.
No file I/O, no Dagster context, no side effects.
This makes them easy to unit test with in-memory DataFrames.
"""

import re

import polars as pl


# Geography levels to include in transforms (exclude Zip/Neighborhood for memory)
INCLUDED_GEOGRAPHY_LEVELS = ["National", "State", "Metro", "County", "City"]


# ---------------------------------------------------------------------------
# Core YoY / MoM computation
# ---------------------------------------------------------------------------


def compute_yoy_mom_changes(
    df: pl.DataFrame,
    partition_cols: list[str],
    sort_cols: list[str],
    value_col: str = "value",
) -> pl.DataFrame:
    """Compute YoY and MoM changes (both absolute USD and percentage).

    Adds columns: prev_month_value, prev_year_value,
    mom_change_usd, mom_change_pct, yoy_change_usd, yoy_change_pct.

    Used by ZHVI and ZORI fact tables.

    Args:
        df: Input DataFrame with a value column and partition/sort columns.
        partition_cols: Columns to partition window functions by.
        sort_cols: Columns to sort by before computing lags.
        value_col: Name of the value column to compute changes on.

    Returns:
        DataFrame with change columns appended.
    """
    return (
        df
        .sort(sort_cols)
        .with_columns([
            pl.col(value_col)
            .shift(1)
            .over(partition_cols)
            .alias("prev_month_value"),

            pl.col(value_col)
            .shift(12)
            .over(partition_cols)
            .alias("prev_year_value"),
        ])
        .with_columns([
            (pl.col(value_col) - pl.col("prev_month_value")).alias("mom_change_usd"),
            (
                (pl.col(value_col) - pl.col("prev_month_value"))
                / pl.col("prev_month_value")
                * 100
            ).round(2).alias("mom_change_pct"),

            (pl.col(value_col) - pl.col("prev_year_value")).alias("yoy_change_usd"),
            (
                (pl.col(value_col) - pl.col("prev_year_value"))
                / pl.col("prev_year_value")
                * 100
            ).round(2).alias("yoy_change_pct"),
        ])
    )


def compute_yoy_mom_pct_only(
    df: pl.DataFrame,
    partition_cols: list[str],
    sort_cols: list[str],
    value_col: str = "value",
) -> pl.DataFrame:
    """Compute YoY and MoM percentage changes only (no absolute amounts).

    Adds columns: mom_change_pct, yoy_change_pct.
    Drops intermediate prev_month / prev_year columns.

    Used by inventory and affordability fact tables.

    Args:
        df: Input DataFrame with a value column and partition/sort columns.
        partition_cols: Columns to partition window functions by.
        sort_cols: Columns to sort by before computing lags.
        value_col: Name of the value column to compute changes on.

    Returns:
        DataFrame with mom_change_pct and yoy_change_pct appended.
    """
    return (
        df
        .sort(sort_cols)
        .with_columns([
            pl.col(value_col)
            .shift(1)
            .over(partition_cols)
            .alias("_prev_month"),

            pl.col(value_col)
            .shift(12)
            .over(partition_cols)
            .alias("_prev_year"),
        ])
        .with_columns([
            (
                (pl.col(value_col).cast(pl.Float64) - pl.col("_prev_month").cast(pl.Float64))
                / pl.col("_prev_month").cast(pl.Float64)
                * 100
            ).round(2).alias("mom_change_pct"),

            (
                (pl.col(value_col).cast(pl.Float64) - pl.col("_prev_year").cast(pl.Float64))
                / pl.col("_prev_year").cast(pl.Float64)
                * 100
            ).round(2).alias("yoy_change_pct"),
        ])
        .drop(["_prev_month", "_prev_year"])
    )


def compute_heat_index_changes(
    df: pl.DataFrame,
    partition_cols: list[str],
    sort_cols: list[str],
) -> pl.DataFrame:
    """Compute absolute MoM/YoY changes and market temperature classification.

    Adds columns: mom_change, yoy_change, market_temperature.

    Args:
        df: Input DataFrame with a ``heat_index`` column.
        partition_cols: Columns to partition window functions by.
        sort_cols: Columns to sort by before computing lags.

    Returns:
        DataFrame with change columns and market_temperature appended.
    """
    return (
        df
        .sort(sort_cols)
        .with_columns([
            pl.col("heat_index")
            .shift(1)
            .over(partition_cols)
            .alias("_prev_month"),

            pl.col("heat_index")
            .shift(12)
            .over(partition_cols)
            .alias("_prev_year"),
        ])
        .with_columns([
            (pl.col("heat_index") - pl.col("_prev_month")).round(2).alias("mom_change"),
            (pl.col("heat_index") - pl.col("_prev_year")).round(2).alias("yoy_change"),
            classify_market_temperature(),
        ])
        .drop(["_prev_month", "_prev_year"])
    )


# ---------------------------------------------------------------------------
# Classification expressions
# ---------------------------------------------------------------------------


def classify_market_by_yoy(col_name: str = "home_value_yoy_pct") -> pl.Expr:
    """Return a Polars expression that classifies markets by YoY home value change.

    Thresholds:
        >10%  -> Hot
        3-10% -> Warm
        <3%   -> Cold
        null  -> Unknown

    Args:
        col_name: Column containing YoY percentage change.

    Returns:
        Polars expression aliased as ``market_classification``.
    """
    return (
        pl.when(pl.col(col_name) > 10)
        .then(pl.lit("Hot"))
        .when(pl.col(col_name) >= 3)
        .then(pl.lit("Warm"))
        .when(pl.col(col_name).is_not_null())
        .then(pl.lit("Cold"))
        .otherwise(pl.lit("Unknown"))
        .alias("market_classification")
    )


def classify_market_temperature(col_name: str = "heat_index") -> pl.Expr:
    """Return a Polars expression that classifies market temperature by heat index.

    Bands:
        >=80 -> Hot
        >=60 -> Warm
        >=40 -> Balanced
        >=20 -> Cool
        <20  -> Cold

    Args:
        col_name: Column containing the heat index (0-100).

    Returns:
        Polars expression aliased as ``market_temperature``.
    """
    return (
        pl.when(pl.col(col_name) >= 80)
        .then(pl.lit("Hot"))
        .when(pl.col(col_name) >= 60)
        .then(pl.lit("Warm"))
        .when(pl.col(col_name) >= 40)
        .then(pl.lit("Balanced"))
        .when(pl.col(col_name) >= 20)
        .then(pl.lit("Cool"))
        .otherwise(pl.lit("Cold"))
        .alias("market_temperature")
    )


# ---------------------------------------------------------------------------
# Region display name
# ---------------------------------------------------------------------------


def build_region_display_name(df: pl.DataFrame) -> pl.DataFrame:
    """Add a ``display_name`` column based on geography level.

    Mapping:
        National -> "United States"
        State    -> state_name
        Metro    -> region_name + " Metro Area"
        County   -> county_name + ", " + state_code
        City     -> city + ", " + state_code
        Other    -> region_name

    Args:
        df: DataFrame with geography_level, region_name, state_name,
            state_code, county_name, city columns.

    Returns:
        DataFrame with ``display_name`` column added.
    """
    return df.with_columns([
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


# ---------------------------------------------------------------------------
# Market summary
# ---------------------------------------------------------------------------


def compute_market_summary(
    zhvi_df: pl.DataFrame,
    zori_df: pl.DataFrame,
    regions_df: pl.DataFrame,
) -> pl.DataFrame:
    """Compute pre-aggregated market summary for the dashboard.

    Joins latest ZHVI (All Homes, Mid-Tier, smoothed, seasonally adjusted)
    and latest ZORI (All Homes, smoothed, seasonally adjusted) per region,
    then derives price-to-rent ratio, gross rent yield, and market classification.

    Args:
        zhvi_df: ZHVI fact table (must contain yoy_change_pct, mom_change_pct).
        zori_df: ZORI fact table (must contain yoy_change_pct, mom_change_pct).
        regions_df: Regions dimension table with display_name.

    Returns:
        Market summary DataFrame with one row per region.
    """
    # Latest ZHVI per region
    latest_zhvi = (
        zhvi_df
        .filter(
            (pl.col("home_type") == "All Homes")
            & (pl.col("tier") == "Mid-Tier")
            & pl.col("smoothed")
            & pl.col("seasonally_adjusted")
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

    # Latest ZORI per region
    latest_zori = (
        zori_df
        .filter(
            (pl.col("home_type") == "All Homes")
            & pl.col("smoothed")
            & pl.col("seasonally_adjusted")
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

    # Join and derive metrics
    return (
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

            # Market classification
            classify_market_by_yoy("home_value_yoy_pct"),
        ])
        .filter(pl.col("current_home_value").is_not_null())
    )


# ---------------------------------------------------------------------------
# CSV parsing helpers (inventory, heat index, affordability)
# ---------------------------------------------------------------------------


def extract_geography_level(filename: str) -> str:
    """Extract geography level from a Zillow CSV filename prefix.

    Args:
        filename: Filename like ``Metro_invt_fs_sfrcondo_sm_month.csv``.

    Returns:
        One of Metro, State, County, City, Zip, National, or Unknown.
    """
    prefixes = {
        "Metro_": "Metro",
        "State_": "State",
        "County_": "County",
        "City_": "City",
        "Zip_": "Zip",
    }
    for prefix, level in prefixes.items():
        if filename.startswith(prefix):
            return level
    return "Unknown"


def extract_home_type(filename: str) -> str:
    """Extract home type from a Zillow CSV filename.

    Args:
        filename: Filename containing home type indicators.

    Returns:
        One of "All Homes", "Single Family", or "Condo".
    """
    if "_sfrcondo_" in filename:
        return "All Homes"
    if "_sfr_" in filename:
        return "Single Family"
    if "_condo_" in filename:
        return "Condo"
    return "All Homes"


def extract_down_payment_pct(filename: str) -> float | None:
    """Extract down payment percentage from a Zillow affordability CSV filename.

    Looks for pattern ``downpayment_0.20`` and returns ``20.0``.

    Args:
        filename: Filename potentially containing downpayment info.

    Returns:
        Down payment as a percentage (e.g. 20.0), or None.
    """
    match = re.search(r"downpayment_(\d+\.\d+)", filename)
    if match:
        return float(match.group(1)) * 100
    return None


def _identify_meta_and_date_cols(
    df: pl.DataFrame,
    date_pattern: str = r"^\d{4}-\d{2}-\d{2}$",
) -> tuple[list[str], list[str]]:
    """Split DataFrame columns into metadata and date columns.

    Args:
        df: Raw CSV DataFrame.
        date_pattern: Regex pattern for date column names.

    Returns:
        Tuple of (meta_cols, date_cols).
    """
    known_meta = {"RegionID", "SizeRank", "RegionName", "RegionType", "StateName"}
    meta_cols = [c for c in df.columns if c in known_meta]
    date_cols = [
        c for c in df.columns
        if c not in meta_cols and re.match(date_pattern, c)
    ]
    return meta_cols, date_cols


def parse_inventory_csv(df: pl.DataFrame, filename: str) -> pl.DataFrame | None:
    """Parse a single raw inventory CSV into normalized long format.

    Args:
        df: Raw CSV DataFrame (wide format with date columns).
        filename: Original filename for metadata extraction.

    Returns:
        Normalized DataFrame, or None if no date columns found.
    """
    geo_level = extract_geography_level(filename)
    home_type = extract_home_type(filename)
    is_smoothed = "_sm_" in filename

    meta_cols, date_cols = _identify_meta_and_date_cols(df, r"^\d")
    # For inventory, date cols may not be strictly YYYY-MM-DD (use starts-with-digit)
    # Re-identify: any column not in meta that starts with a digit
    date_cols = [c for c in df.columns if c not in meta_cols and c[0].isdigit()]

    if not date_cols:
        return None

    melted = df.unpivot(
        index=meta_cols,
        on=date_cols,
        variable_name="date",
        value_name="inventory_count",
    )

    melted = melted.with_columns([
        pl.col("RegionID").cast(pl.Utf8).alias("region_id"),
        pl.lit(geo_level).alias("geography_level"),
        pl.lit(home_type).alias("home_type"),
        pl.lit(is_smoothed).alias("smoothed"),
        pl.lit("monthly").alias("frequency"),
        pl.col("inventory_count").cast(pl.Int64),
    ])

    return melted.select([
        "region_id", "date", "inventory_count",
        "geography_level", "home_type", "smoothed", "frequency",
    ])


def parse_heat_index_csv(df: pl.DataFrame, filename: str) -> pl.DataFrame | None:
    """Parse a single raw market heat index CSV into normalized long format.

    Args:
        df: Raw CSV DataFrame (wide format).
        filename: Original filename for metadata extraction.

    Returns:
        Normalized DataFrame, or None if no date columns found.
    """
    # Heat index uses "National" as default instead of "Unknown"
    prefixes = {
        "Metro_": "Metro",
        "State_": "State",
        "County_": "County",
        "Zip_": "Zip",
    }
    geo_level = "National"
    for prefix, level in prefixes.items():
        if filename.startswith(prefix):
            geo_level = level
            break

    meta_cols, date_cols = _identify_meta_and_date_cols(df)

    if not date_cols:
        return None

    melted = df.unpivot(
        index=meta_cols,
        on=date_cols,
        variable_name="date",
        value_name="heat_index",
    )

    melted = melted.with_columns([
        pl.col("RegionID").cast(pl.Utf8).alias("region_id"),
        pl.lit(geo_level).alias("geography_level"),
        pl.col("heat_index").cast(pl.Float64),
    ])

    return melted.select(["region_id", "date", "heat_index", "geography_level"])


def parse_affordability_csv(
    df: pl.DataFrame,
    filename: str,
    metric_type: str,
) -> pl.DataFrame | None:
    """Parse a single raw affordability CSV into normalized long format.

    Args:
        df: Raw CSV DataFrame (wide format).
        filename: Original filename for metadata extraction.
        metric_type: Type label (e.g. "mortgage_payment", "renter_income_needed").

    Returns:
        Normalized DataFrame, or None if no date columns found.
    """
    # Affordability uses "National" as default
    prefixes = {
        "Metro_": "Metro",
        "State_": "State",
        "County_": "County",
        "Zip_": "Zip",
    }
    geo_level = "National"
    for prefix, level in prefixes.items():
        if filename.startswith(prefix):
            geo_level = level
            break

    down_payment_pct = extract_down_payment_pct(filename)

    meta_cols, date_cols = _identify_meta_and_date_cols(df)

    if not date_cols:
        return None

    melted = df.unpivot(
        index=meta_cols,
        on=date_cols,
        variable_name="date",
        value_name="value",
    )

    melted = melted.with_columns([
        pl.col("RegionID").cast(pl.Utf8).alias("region_id"),
        pl.lit(geo_level).alias("geography_level"),
        pl.lit(metric_type).alias("metric_type"),
        pl.lit(down_payment_pct).alias("down_payment_pct"),
        pl.col("value").cast(pl.Float64),
    ])

    return melted.select([
        "region_id", "date", "value",
        "geography_level", "metric_type", "down_payment_pct",
    ])

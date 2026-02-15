"""
Dagster Sensors.

Event-driven triggers for automated pipeline execution.
"""

from dagster import (
    AssetKey,
    RunRequest,
    SensorEvaluationContext,
    SensorResult,
    SkipReason,
    asset_sensor,
    sensor,
)

from .paths import RAW_DIR, MART_DIR

# =============================================================================
# File-based Sensors
# =============================================================================

@sensor(
    name="new_csv_sensor",
    description="Detect new CSV files in the data directory",
    minimum_interval_seconds=300,  # Check every 5 minutes
)
def new_csv_sensor(context: SensorEvaluationContext) -> SensorResult:
    """
    Sensor that triggers when new CSV files are detected.

    Monitors the data directory for new Zillow CSV downloads
    and triggers the transformation job.
    """
    data_dir = RAW_DIR
    if not data_dir.exists():
        return SensorResult(skip_reason=SkipReason("Data directory does not exist"))

    # Get all CSV files
    csv_files = list(data_dir.rglob("*.csv"))

    if not csv_files:
        return SensorResult(skip_reason=SkipReason("No CSV files found"))

    # Check for files modified since last run
    last_run_timestamp = float(context.cursor or "0")
    new_files = [
        f for f in csv_files
        if f.stat().st_mtime > last_run_timestamp
    ]

    if not new_files:
        return SensorResult(skip_reason=SkipReason("No new files since last run"))

    # Update cursor to latest modification time
    latest_mtime = max(f.stat().st_mtime for f in new_files)

    context.log.info(f"Found {len(new_files)} new/modified CSV files")

    return SensorResult(
        run_requests=[
            RunRequest(
                run_key=f"csv-update-{int(latest_mtime)}",
                run_config={},
                tags={"trigger": "new_csv_sensor", "file_count": str(len(new_files))},
            )
        ],
        cursor=str(latest_mtime),
    )


# =============================================================================
# Asset-based Sensors
# =============================================================================

@asset_sensor(
    asset_key=AssetKey("zillow_zhvi_transformed"),
    name="zhvi_transformed_sensor",
    description="Trigger database load when ZHVI transformation completes",
    minimum_interval_seconds=60,
)
def zhvi_transformed_sensor(context: SensorEvaluationContext):
    """
    Sensor that triggers database load when ZHVI transformation completes.
    """
    # This sensor will automatically trigger when the asset materializes
    return RunRequest(
        run_key=context.cursor,
        run_config={},
        tags={"trigger": "zhvi_transformed_sensor"},
    )


@asset_sensor(
    asset_key=AssetKey("zillow_zori_transformed"),
    name="zori_transformed_sensor",
    description="Trigger database load when ZORI transformation completes",
    minimum_interval_seconds=60,
)
def zori_transformed_sensor(context: SensorEvaluationContext):
    """
    Sensor that triggers database load when ZORI transformation completes.
    """
    return RunRequest(
        run_key=context.cursor,
        run_config={},
        tags={"trigger": "zori_transformed_sensor"},
    )


# =============================================================================
# Health Check Sensors
# =============================================================================

@sensor(
    name="data_freshness_sensor",
    description="Alert when data becomes stale",
    minimum_interval_seconds=3600,  # Check every hour
)
def data_freshness_sensor(context: SensorEvaluationContext) -> SensorResult:
    """
    Sensor that checks data freshness and alerts when stale.

    Monitors the processed data directory and triggers a refresh
    if data is older than the configured threshold.
    """
    if not MART_DIR.exists():
        return SensorResult(skip_reason=SkipReason("Mart directory does not exist"))

    parquet_files = list(MART_DIR.glob("*.parquet"))

    if not parquet_files:
        # No data yet - trigger initial load
        return SensorResult(
            run_requests=[
                RunRequest(
                    run_key="initial-load",
                    run_config={},
                    tags={"trigger": "data_freshness_sensor", "reason": "no_data"},
                )
            ]
        )

    # Check age of newest file
    import time

    newest_mtime = max(f.stat().st_mtime for f in parquet_files)
    age_hours = (time.time() - newest_mtime) / 3600

    # If data is older than 7 days, trigger refresh
    max_age_hours = 7 * 24  # 7 days

    if age_hours > max_age_hours:
        context.log.warning(f"Data is {age_hours:.1f} hours old (max: {max_age_hours})")
        return SensorResult(
            run_requests=[
                RunRequest(
                    run_key=f"stale-data-{int(time.time())}",
                    run_config={},
                    tags={
                        "trigger": "data_freshness_sensor",
                        "reason": "stale_data",
                        "age_hours": str(int(age_hours)),
                    },
                )
            ]
        )

    return SensorResult(
        skip_reason=SkipReason(f"Data is fresh ({age_hours:.1f} hours old)")
    )


# Export all sensors
sensors = [
    new_csv_sensor,
    zhvi_transformed_sensor,
    zori_transformed_sensor,
    data_freshness_sensor,
]

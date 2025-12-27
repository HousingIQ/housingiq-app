"""
Dagster Schedules.

Scheduled jobs for automated data pipeline execution.
"""

from dagster import (
    AssetSelection,
    ScheduleDefinition,
    define_asset_job,
)

# =============================================================================
# Jobs
# =============================================================================

# Job to refresh all Zillow data
zillow_refresh_job = define_asset_job(
    name="zillow_refresh_job",
    selection=AssetSelection.groups("zillow_ingestion"),
    description="Download and transform latest Zillow data",
)

# Job to load data to database
database_load_job = define_asset_job(
    name="database_load_job",
    selection=AssetSelection.groups("database"),
    description="Load transformed data to PostgreSQL",
)

# Full pipeline job
full_pipeline_job = define_asset_job(
    name="full_pipeline_job",
    selection=AssetSelection.groups("zillow_ingestion", "database"),
    description="Run complete data pipeline: download, transform, and load",
)


# =============================================================================
# Schedules
# =============================================================================

# Weekly refresh of Zillow data (Sundays at 2 AM)
weekly_zillow_refresh = ScheduleDefinition(
    job=zillow_refresh_job,
    cron_schedule="0 2 * * 0",  # Every Sunday at 2:00 AM
    description="Weekly refresh of Zillow data",
    default_status="STOPPED",  # Start manually first time
)

# Daily database load (every day at 3 AM)
daily_database_load = ScheduleDefinition(
    job=database_load_job,
    cron_schedule="0 3 * * *",  # Every day at 3:00 AM
    description="Daily load of transformed data to database",
    default_status="STOPPED",
)

# Monthly full refresh (1st of each month at 1 AM)
monthly_full_refresh = ScheduleDefinition(
    job=full_pipeline_job,
    cron_schedule="0 1 1 * *",  # 1st of each month at 1:00 AM
    description="Monthly full data pipeline refresh",
    default_status="STOPPED",
)


# Export all schedules
schedules = [
    weekly_zillow_refresh,
    daily_database_load,
    monthly_full_refresh,
]

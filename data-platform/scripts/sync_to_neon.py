#!/usr/bin/env python3
"""
Sync app schema tables from local PostgreSQL to Neon (production).

This script exports the `app` schema tables from local PostgreSQL
and imports them into Neon PostgreSQL for production webapp use.

Usage:
    # Set environment variables
    export LOCAL_DATABASE_URL="postgresql://housingiq:housingiq@localhost:5432/housingiq"
    export NEON_DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

    # Run sync (with default filters: 5 years, top 5000 regions, ~450MB)
    python scripts/sync_to_neon.py

    # Sync all data (no filters)
    python scripts/sync_to_neon.py --years 0 --top-regions 0

    # Custom filters
    python scripts/sync_to_neon.py --years 3 --top-regions 3000

    # Dry run (show what would be synced)
    python scripts/sync_to_neon.py --dry-run
"""

import argparse
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from dateutil.relativedelta import relativedelta

import polars as pl
from sqlalchemy import create_engine, text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Default filters to fit ~450MB on Neon free tier
DEFAULT_YEARS = 5
DEFAULT_TOP_REGIONS = 5000

# Tables to sync (app schema only - these are what the webapp needs)
# Categorized by how they should be filtered
SMALL_TABLES = ["market_summary", "market_heat_index"]  # Filter by region only
TIME_SERIES_TABLES = ["zhvi_values", "zori_values", "affordability_metrics", "inventory_values"]  # Filter by region + date
REGION_TABLE = "regions"  # Filter by size_rank

APP_TABLES = [REGION_TABLE] + SMALL_TABLES + TIME_SERIES_TABLES

# Batch size for large tables (1 million rows per batch)
BATCH_SIZE = 1_000_000


@dataclass
class SyncStats:
    """Statistics for sync operation."""
    table_name: str
    rows_synced: int
    status: str


@dataclass
class SyncFilters:
    """Filters for syncing data."""
    years: int  # 0 = no filter
    top_regions: int  # 0 = no filter
    cutoff_date: str | None = None  # Computed from years

    def __post_init__(self):
        if self.years > 0:
            cutoff = datetime.now() - relativedelta(years=self.years)
            self.cutoff_date = cutoff.strftime("%Y-%m-%d")


def get_table_row_count(engine, schema: str, table: str) -> int:
    """Get row count for a table."""
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT COUNT(*) FROM {schema}.{table}"))
        return result.scalar() or 0


def table_exists(engine, schema: str, table: str) -> bool:
    """Check if a table exists."""
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = :schema
                AND table_name = :table
            )
        """), {"schema": schema, "table": table})
        return result.scalar() or False


def ensure_app_schema(engine) -> None:
    """Create app schema if it doesn't exist."""
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS app"))
        conn.commit()


def build_query(table_name: str, filters: SyncFilters) -> str:
    """Build SELECT query with appropriate filters for each table type."""
    full_table = f"app.{table_name}"

    # No filters
    if filters.years == 0 and filters.top_regions == 0:
        return f"SELECT * FROM {full_table}"

    # Regions table: filter by size_rank
    if table_name == REGION_TABLE:
        if filters.top_regions > 0:
            return f"SELECT * FROM {full_table} WHERE size_rank <= {filters.top_regions}"
        return f"SELECT * FROM {full_table}"

    # Build WHERE clauses
    conditions = []

    # Region filter (join with regions table to get top N)
    if filters.top_regions > 0:
        conditions.append(f"region_id IN (SELECT region_id FROM app.regions WHERE size_rank <= {filters.top_regions})")

    # Date filter for time-series tables
    if filters.years > 0 and table_name in TIME_SERIES_TABLES:
        conditions.append(f"date >= '{filters.cutoff_date}'")

    if conditions:
        where_clause = " AND ".join(conditions)
        return f"SELECT * FROM {full_table} WHERE {where_clause}"

    return f"SELECT * FROM {full_table}"


def get_filtered_row_count(engine, table_name: str, filters: SyncFilters) -> int:
    """Get row count for a table with filters applied."""
    query = build_query(table_name, filters)
    count_query = f"SELECT COUNT(*) FROM ({query}) subq"

    with engine.connect() as conn:
        result = conn.execute(text(count_query))
        return result.scalar() or 0


def sync_table(
    local_url: str,
    neon_url: str,
    table_name: str,
    filters: SyncFilters,
    dry_run: bool = False,
    batch_size: int = BATCH_SIZE,
) -> SyncStats:
    """
    Sync a single table from local to Neon with optional filtering.

    Uses batch processing for large tables to avoid OOM errors.
    """
    full_table_name = f"app.{table_name}"

    try:
        # Check if source table exists
        local_engine = create_engine(local_url)
        if not table_exists(local_engine, "app", table_name):
            logger.warning(f"Table {full_table_name} does not exist locally, skipping")
            return SyncStats(table_name, 0, "skipped - not found")

        # Get filtered row count
        row_count = get_filtered_row_count(local_engine, table_name, filters)

        if row_count == 0:
            logger.warning(f"Table {full_table_name} is empty after filtering, skipping")
            return SyncStats(table_name, 0, "skipped - empty")

        # Build the query
        query = build_query(table_name, filters)

        if dry_run:
            logger.info(f"[DRY RUN] Would sync {full_table_name}: {row_count:,} rows")
            return SyncStats(table_name, row_count, "dry_run")

        # Ensure app schema exists in Neon and drop existing table
        neon_engine = create_engine(neon_url)
        ensure_app_schema(neon_engine)
        with neon_engine.connect() as conn:
            conn.execute(text(f"DROP TABLE IF EXISTS {full_table_name} CASCADE"))
            conn.commit()

        # For small tables, use simple read/write
        if row_count <= batch_size:
            logger.info(f"Reading {full_table_name} from local ({row_count:,} rows)...")
            df = pl.read_database_uri(query=query, uri=local_url)

            logger.info(f"Writing {full_table_name} to Neon...")
            df.write_database(
                table_name=full_table_name,
                connection=neon_engine,
                if_table_exists="append",
            )

            logger.info(f"✓ Synced {full_table_name}: {len(df):,} rows")
            return SyncStats(table_name, len(df), "success")

        # For large tables, use batch processing
        num_batches = (row_count + batch_size - 1) // batch_size
        logger.info(
            f"Reading {full_table_name} from local ({row_count:,} rows) "
            f"in {num_batches} batches of {batch_size:,}..."
        )

        total_rows_synced = 0
        for batch_num in range(num_batches):
            offset = batch_num * batch_size
            batch_query = f"{query} LIMIT {batch_size} OFFSET {offset}"

            # Read batch from local
            logger.info(
                f"  Batch {batch_num + 1}/{num_batches}: "
                f"reading rows {offset:,} to {min(offset + batch_size, row_count):,}..."
            )
            df = pl.read_database_uri(query=batch_query, uri=local_url)

            if df.is_empty():
                break

            # Write batch to Neon
            logger.info(f"  Batch {batch_num + 1}/{num_batches}: writing {len(df):,} rows to Neon...")
            df.write_database(
                table_name=full_table_name,
                connection=neon_engine,
                if_table_exists="append",
            )

            total_rows_synced += len(df)
            del df

        logger.info(f"✓ Synced {full_table_name}: {total_rows_synced:,} rows")
        return SyncStats(table_name, total_rows_synced, "success")

    except Exception as e:
        logger.error(f"✗ Failed to sync {full_table_name}: {e}")
        return SyncStats(table_name, 0, f"failed: {e}")


def estimate_size_mb(stats: list[SyncStats]) -> float:
    """Estimate total size in MB based on row counts and average bytes per row."""
    # Average bytes per row (from actual measurements)
    BYTES_PER_ROW = {
        "regions": 107,
        "zhvi_values": 114,
        "zori_values": 96,
        "market_summary": 148,
        "inventory_values": 110,
        "market_heat_index": 101,
        "affordability_metrics": 105,
    }

    total_bytes = 0
    for stat in stats:
        bytes_per_row = BYTES_PER_ROW.get(stat.table_name, 100)
        total_bytes += stat.rows_synced * bytes_per_row

    return total_bytes / (1024 * 1024)


def sync_all_tables(
    local_url: str,
    neon_url: str,
    filters: SyncFilters,
    tables: list[str] | None = None,
    dry_run: bool = False,
) -> list[SyncStats]:
    """
    Sync all app schema tables from local to Neon.
    """
    tables_to_sync = tables or APP_TABLES
    stats = []

    logger.info("=" * 60)
    logger.info("HousingIQ: Syncing app schema to Neon")
    logger.info("=" * 60)
    logger.info(f"Tables to sync: {', '.join(tables_to_sync)}")

    # Show filter info
    if filters.years > 0 or filters.top_regions > 0:
        logger.info(f"Filters:")
        if filters.top_regions > 0:
            logger.info(f"  - Top {filters.top_regions} regions (by size_rank)")
        if filters.years > 0:
            logger.info(f"  - Last {filters.years} years (since {filters.cutoff_date})")
    else:
        logger.info("Filters: None (syncing all data)")

    if dry_run:
        logger.info("Mode: DRY RUN (no changes will be made)")
    logger.info("")

    # Sync regions first (other tables depend on it for filtering)
    if REGION_TABLE in tables_to_sync:
        stat = sync_table(local_url, neon_url, REGION_TABLE, filters, dry_run)
        stats.append(stat)
        tables_to_sync = [t for t in tables_to_sync if t != REGION_TABLE]

    # Sync remaining tables
    for table in tables_to_sync:
        stat = sync_table(local_url, neon_url, table, filters, dry_run)
        stats.append(stat)

    # Summary
    logger.info("")
    logger.info("=" * 60)
    logger.info("Sync Summary")
    logger.info("=" * 60)

    total_rows = 0
    success_count = 0
    for stat in stats:
        status_icon = "✓" if stat.status == "success" else "○" if "dry_run" in stat.status else "✗"
        logger.info(f"  {status_icon} {stat.table_name}: {stat.rows_synced:,} rows ({stat.status})")
        total_rows += stat.rows_synced
        if stat.status == "success" or stat.status == "dry_run":
            success_count += 1

    estimated_mb = estimate_size_mb(stats)
    logger.info("")
    logger.info(f"Total: {total_rows:,} rows across {len(stats)} tables")
    logger.info(f"Estimated size: ~{estimated_mb:.0f} MB")
    if not dry_run:
        logger.info(f"Successfully synced: {success_count}/{len(stats)} tables")

    return stats


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Sync app schema tables from local PostgreSQL to Neon",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--local-url",
        default=os.getenv(
            "LOCAL_DATABASE_URL",
            "postgresql://housingiq:housingiq@localhost:5432/housingiq"
        ),
        help="Local PostgreSQL connection string",
    )
    parser.add_argument(
        "--neon-url",
        default=os.getenv("NEON_DATABASE_URL"),
        help="Neon PostgreSQL connection string",
    )
    parser.add_argument(
        "--tables",
        nargs="+",
        choices=APP_TABLES,
        help="Specific tables to sync (default: all)",
    )
    parser.add_argument(
        "--years",
        type=int,
        default=DEFAULT_YEARS,
        help=f"Only sync last N years of time-series data (0=all, default={DEFAULT_YEARS})",
    )
    parser.add_argument(
        "--top-regions",
        type=int,
        default=DEFAULT_TOP_REGIONS,
        help=f"Only sync top N regions by size_rank (0=all, default={DEFAULT_TOP_REGIONS})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be synced without making changes",
    )

    args = parser.parse_args()

    # Validate Neon URL
    if not args.neon_url:
        logger.error("NEON_DATABASE_URL environment variable or --neon-url argument required")
        return 1

    # Create filters
    filters = SyncFilters(years=args.years, top_regions=args.top_regions)

    try:
        stats = sync_all_tables(
            local_url=args.local_url,
            neon_url=args.neon_url,
            filters=filters,
            tables=args.tables,
            dry_run=args.dry_run,
        )

        # Return non-zero if any syncs failed
        failed = [s for s in stats if "failed" in s.status]
        return 1 if failed else 0

    except Exception as e:
        logger.exception(f"Sync failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

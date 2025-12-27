"""
Zillow Data Assets.

Software-defined assets for Zillow data ingestion and transformation.
"""

from pathlib import Path

import polars as pl
from dagster import (
    AssetExecutionContext,
    AssetKey,
    MaterializeResult,
    MetadataValue,
    asset,
)

from ingestion.sources.zillow import (
    ZillowDownloader,
    ZillowScraper,
    ZillowTransformer,
)
from ingestion.sources.zillow.config import DEFAULT_CATEGORIES


# Configuration
DATA_DIR = Path("data")
PROCESSED_DIR = DATA_DIR / "processed"


@asset(
    group_name="zillow_ingestion",
    description="Generate manifest of all available Zillow data URLs",
    compute_kind="python",
)
def zillow_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """
    Generate manifest of all Zillow download URLs.

    This asset scrapes the Zillow Research data catalog and generates
    a manifest file with all available download URLs.
    """
    scraper = ZillowScraper(manifest_path=DATA_DIR / "manifest.json")
    links = scraper.generate_all_urls()
    manifest = scraper.save_manifest(links)

    context.log.info(f"Generated manifest with {len(links)} URLs")

    return MaterializeResult(
        metadata={
            "total_links": MetadataValue.int(manifest["total_links"]),
            "categories": MetadataValue.json(manifest["categories"]),
            "manifest_path": MetadataValue.path(str(DATA_DIR / "manifest.json")),
        }
    )


@asset(
    group_name="zillow_ingestion",
    description="Download raw Zillow CSV files",
    deps=[AssetKey("zillow_manifest")],
    compute_kind="python",
)
def zillow_raw_files(context: AssetExecutionContext) -> MaterializeResult:
    """
    Download raw Zillow CSV files.

    Downloads CSV files for configured categories. Skips existing files
    to enable incremental updates.
    """
    # Generate URLs for default categories
    scraper = ZillowScraper()
    links = scraper.generate_urls_for_categories(DEFAULT_CATEGORIES)

    context.log.info(f"Downloading {len(links)} files for categories: {DEFAULT_CATEGORIES}")

    # Download files
    downloader = ZillowDownloader(
        output_dir=DATA_DIR,
        skip_existing=True,
    )
    stats = downloader.download_links(links)

    # Save download log
    downloader.save_download_log(DATA_DIR / "download_log.json")

    context.log.info(
        f"Download complete: {stats.success} success, "
        f"{stats.skipped} skipped, {stats.failed} failed"
    )

    storage = downloader.get_storage_stats()

    return MaterializeResult(
        metadata={
            "total_files": MetadataValue.int(stats.total),
            "success": MetadataValue.int(stats.success),
            "skipped": MetadataValue.int(stats.skipped),
            "failed": MetadataValue.int(stats.failed),
            "total_size_mb": MetadataValue.float(storage["total_size_mb"]),
            "categories": MetadataValue.json(DEFAULT_CATEGORIES),
        }
    )


@asset(
    group_name="zillow_ingestion",
    description="Transform ZHVI data to normalized format",
    deps=[AssetKey("zillow_raw_files")],
    compute_kind="polars",
)
def zillow_zhvi_transformed(context: AssetExecutionContext) -> MaterializeResult:
    """
    Transform ZHVI (Zillow Home Value Index) data.

    Reads raw CSV files, normalizes to long format, and outputs
    Parquet files for regions and values.
    """
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    transformer = ZillowTransformer(
        input_dir=DATA_DIR,
        output_dir=PROCESSED_DIR,
    )

    try:
        regions_df, values_df = transformer.process_category("zhvi")

        # Save to parquet
        regions_path, values_path = transformer.save_to_parquet(
            regions_df, values_df, "zhvi"
        )

        context.log.info(
            f"ZHVI transformed: {len(regions_df)} regions, {len(values_df)} values"
        )

        # Calculate date range
        date_min = values_df["date"].min()
        date_max = values_df["date"].max()

        return MaterializeResult(
            metadata={
                "regions_count": MetadataValue.int(len(regions_df)),
                "values_count": MetadataValue.int(len(values_df)),
                "date_range_start": MetadataValue.text(str(date_min)),
                "date_range_end": MetadataValue.text(str(date_max)),
                "regions_path": MetadataValue.path(str(regions_path)),
                "values_path": MetadataValue.path(str(values_path)),
            }
        )
    except FileNotFoundError as e:
        context.log.warning(f"ZHVI data not found: {e}")
        return MaterializeResult(
            metadata={
                "status": MetadataValue.text("no_data"),
                "error": MetadataValue.text(str(e)),
            }
        )


@asset(
    group_name="zillow_ingestion",
    description="Transform ZORI data to normalized format",
    deps=[AssetKey("zillow_raw_files")],
    compute_kind="polars",
)
def zillow_zori_transformed(context: AssetExecutionContext) -> MaterializeResult:
    """
    Transform ZORI (Zillow Observed Rent Index) data.

    Reads raw CSV files, normalizes to long format, and outputs
    Parquet files for regions and values.
    """
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    transformer = ZillowTransformer(
        input_dir=DATA_DIR,
        output_dir=PROCESSED_DIR,
    )

    try:
        regions_df, values_df = transformer.process_category("zori")

        # Save to parquet
        regions_path, values_path = transformer.save_to_parquet(
            regions_df, values_df, "zori"
        )

        context.log.info(
            f"ZORI transformed: {len(regions_df)} regions, {len(values_df)} values"
        )

        # Calculate date range
        date_min = values_df["date"].min()
        date_max = values_df["date"].max()

        return MaterializeResult(
            metadata={
                "regions_count": MetadataValue.int(len(regions_df)),
                "values_count": MetadataValue.int(len(values_df)),
                "date_range_start": MetadataValue.text(str(date_min)),
                "date_range_end": MetadataValue.text(str(date_max)),
                "regions_path": MetadataValue.path(str(regions_path)),
                "values_path": MetadataValue.path(str(values_path)),
            }
        )
    except FileNotFoundError as e:
        context.log.warning(f"ZORI data not found: {e}")
        return MaterializeResult(
            metadata={
                "status": MetadataValue.text("no_data"),
                "error": MetadataValue.text(str(e)),
            }
        )

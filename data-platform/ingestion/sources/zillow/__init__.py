"""
Zillow Data Source - Ingestion module for Zillow Research data.

This module provides tools to:
- Scrape available dataset URLs from Zillow Research
- Download CSV files with concurrent requests
- Transform raw data to normalized format using Polars

Example usage:
    from ingestion.sources.zillow import ZillowSource

    source = ZillowSource(data_dir="./data")
    source.run_full_pipeline(categories=["zhvi", "zori"])
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from .config import DEFAULT_CATEGORIES, URL_PATTERNS
from .downloader import ZillowDownloader, download_zillow_data
from .schemas import (
    DownloadManifest,
    DownloadResult,
    DownloadStats,
    LinkInfo,
    Region,
    ZHVIValue,
    ZORIValue,
)
from .scraper import ZillowScraper, scrape_zillow_urls
from .transformer import ZillowTransformer, transform_zillow_category

if TYPE_CHECKING:
    import polars as pl


class ZillowSource:
    """
    Unified interface for Zillow data ingestion.

    Combines scraping, downloading, and transformation into a single class.
    """

    def __init__(
        self,
        data_dir: Path | str = "data",
        processed_dir: Path | str | None = None,
    ) -> None:
        """
        Initialize Zillow source.

        Args:
            data_dir: Directory for raw downloaded data
            processed_dir: Directory for processed parquet files
        """
        self.data_dir = Path(data_dir)
        self.processed_dir = Path(processed_dir) if processed_dir else self.data_dir / "processed"

        self.scraper = ZillowScraper()
        self.downloader = ZillowDownloader(output_dir=self.data_dir)
        self.transformer = ZillowTransformer(
            input_dir=self.data_dir,
            output_dir=self.processed_dir,
        )

    def scrape_urls(
        self,
        categories: list[str] | None = None,
    ) -> list[dict]:
        """
        Generate download URLs for specified categories.

        Args:
            categories: List of categories (default: all)

        Returns:
            List of link info dictionaries
        """
        if categories:
            return self.scraper.generate_urls_for_categories(categories)
        return self.scraper.generate_all_urls()

    def download(
        self,
        categories: list[str] | None = None,
        skip_existing: bool = True,
    ) -> DownloadStats:
        """
        Download data files.

        Args:
            categories: Categories to download (default from config)
            skip_existing: Skip existing files

        Returns:
            Download statistics
        """
        categories = categories or DEFAULT_CATEGORIES
        links = self.scrape_urls(categories)

        self.downloader.skip_existing = skip_existing
        return self.downloader.download_links(links)

    def transform(
        self,
        category: str,
    ) -> tuple[pl.DataFrame, pl.DataFrame]:
        """
        Transform a category to normalized format.

        Args:
            category: Category name

        Returns:
            Tuple of (regions_df, values_df)
        """
        return self.transformer.process_category(category)

    def run_full_pipeline(
        self,
        categories: list[str] | None = None,
        skip_existing: bool = True,
    ) -> dict:
        """
        Run complete ingestion pipeline.

        Args:
            categories: Categories to process
            skip_existing: Skip existing downloads

        Returns:
            Pipeline results summary
        """
        categories = categories or DEFAULT_CATEGORIES
        results = {
            "download": None,
            "transform": {},
        }

        # Download
        results["download"] = self.download(
            categories=categories,
            skip_existing=skip_existing,
        )

        # Transform each category
        for category in categories:
            try:
                regions, values = self.transform(category)
                results["transform"][category] = {
                    "regions_count": len(regions),
                    "values_count": len(values),
                }
            except Exception as e:
                results["transform"][category] = {"error": str(e)}

        return results


__all__ = [
    # Main class
    "ZillowSource",
    # Scraper
    "ZillowScraper",
    "scrape_zillow_urls",
    # Downloader
    "ZillowDownloader",
    "download_zillow_data",
    # Transformer
    "ZillowTransformer",
    "transform_zillow_category",
    # Schemas
    "DownloadManifest",
    "DownloadResult",
    "DownloadStats",
    "LinkInfo",
    "Region",
    "ZHVIValue",
    "ZORIValue",
    # Config
    "DEFAULT_CATEGORIES",
    "URL_PATTERNS",
]

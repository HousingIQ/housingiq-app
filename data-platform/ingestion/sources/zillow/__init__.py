"""Zillow data source for HousingIQ.

This module provides functionality to:
- Scrape Zillow Research data URLs
- Download CSV files in parallel
- Transform data from wide to long format
"""

from .scraper import ZillowScraper
from .downloader import ZillowDownloader
from .transformer import ZillowTransformer

# Convenience class that combines all functionality
class ZillowSource:
    """Complete Zillow data source with scraper, downloader, and transformer."""

    def __init__(self, data_dir: str = "data"):
        self.scraper = ZillowScraper()
        self.downloader = ZillowDownloader(output_dir=f"{data_dir}/raw/zillow")
        self.transformer = ZillowTransformer(
            input_dir=f"{data_dir}/raw/zillow",
            output_dir=f"{data_dir}/staging"
        )

    def generate_manifest(self, output_path: str = "data/raw/zillow/manifest.json"):
        """Generate URL manifest."""
        links = self.scraper.generate_all_urls()
        self.scraper.save_manifest(links, output_path)
        return links

    def download(self, categories: list[str] | None = None, force: bool = False):
        """Download data for specified categories."""
        return self.downloader.download_from_manifest(
            categories=categories,
            skip_existing=not force
        )

    def transform(self, category: str = "zhvi"):
        """Transform downloaded data."""
        return self.transformer.run(category=category)


__all__ = ["ZillowSource", "ZillowScraper", "ZillowDownloader", "ZillowTransformer"]

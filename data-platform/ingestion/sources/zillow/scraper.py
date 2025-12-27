"""
Zillow URL Scraper - Generate download URLs from configured patterns.

Migrated from zillow_data_sc/scrapper.py with improvements:
- Type hints throughout
- Configuration from config.py
- No hardcoded values
- Cleaner architecture
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import TYPE_CHECKING

from .config import BASE_CDN_URL, URL_PATTERNS

if TYPE_CHECKING:
    from .schemas import DownloadManifest, LinkInfo


class ZillowScraper:
    """Generate all possible download URLs from configured patterns."""

    def __init__(self, manifest_path: Path | None = None) -> None:
        """
        Initialize scraper.

        Args:
            manifest_path: Optional path to save/load manifest
        """
        self.manifest_path = manifest_path or Path("manifest.json")

    def generate_all_urls(self) -> list[dict]:
        """
        Generate all possible URLs from configured patterns.

        Returns:
            List of link info dictionaries
        """
        all_links: list[dict] = []

        for pattern_name, pattern_info in URL_PATTERNS.items():
            category = pattern_info["category"]
            template = pattern_info["template"]
            geographies = pattern_info["geographies"]
            description = pattern_info["description"]

            for geo in geographies:
                # Handle special case for National (no {geo} placeholder)
                if geo == "National":
                    filename = template
                else:
                    filename = template.format(geo=geo)

                full_url = f"{BASE_CDN_URL}/{category}/{filename}"

                all_links.append({
                    "url": full_url,
                    "category": category,
                    "filename": filename,
                    "geography": geo,
                    "description": f"{description} ({geo} level)",
                    "pattern_name": pattern_name,
                    "url_hash": hashlib.md5(full_url.encode()).hexdigest(),
                })

        return all_links

    def generate_urls_for_categories(
        self,
        categories: list[str],
    ) -> list[dict]:
        """
        Generate URLs for specific categories only.

        Args:
            categories: List of category names (e.g., ['zhvi', 'zori'])

        Returns:
            Filtered list of link info dictionaries
        """
        all_links = self.generate_all_urls()
        return [link for link in all_links if link["category"] in categories]

    def save_manifest(self, links: list[dict], output_path: Path | None = None) -> dict:
        """
        Save manifest with full details.

        Args:
            links: List of link info dictionaries
            output_path: Optional output path (defaults to self.manifest_path)

        Returns:
            The manifest dictionary
        """
        output_path = output_path or self.manifest_path
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Group by category
        by_category: dict[str, list[dict]] = {}
        for link in links:
            cat = link["category"]
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(link)

        manifest = {
            "total_links": len(links),
            "total_categories": len(by_category),
            "categories": list(by_category.keys()),
            "links_by_category": by_category,
            "all_links": links,
        }

        with open(output_path, "w") as f:
            json.dump(manifest, f, indent=2)

        return manifest

    def load_manifest(self, manifest_path: Path | None = None) -> dict:
        """
        Load previous manifest.

        Args:
            manifest_path: Optional path (defaults to self.manifest_path)

        Returns:
            Manifest dictionary or empty manifest if not found
        """
        path = manifest_path or self.manifest_path
        if not path.exists():
            return {"all_links": []}

        with open(path) as f:
            return json.load(f)

    def get_new_links(
        self,
        current_links: list[dict],
        manifest_path: Path | None = None,
    ) -> list[dict]:
        """
        Find new links not in previous manifest.

        Args:
            current_links: Current list of links
            manifest_path: Optional path to previous manifest

        Returns:
            List of new links
        """
        previous = self.load_manifest(manifest_path)
        previous_hashes = {
            link["url_hash"] for link in previous.get("all_links", [])
        }

        return [
            link for link in current_links
            if link["url_hash"] not in previous_hashes
        ]

    def get_summary(self, links: list[dict]) -> dict:
        """
        Get summary statistics for links.

        Args:
            links: List of link info dictionaries

        Returns:
            Summary dictionary with counts by category
        """
        by_category: dict[str, int] = {}
        for link in links:
            cat = link["category"]
            by_category[cat] = by_category.get(cat, 0) + 1

        return {
            "total_files": len(links),
            "total_categories": len(by_category),
            "by_category": by_category,
        }


def scrape_zillow_urls(
    categories: list[str] | None = None,
    manifest_path: Path | None = None,
) -> list[dict]:
    """
    Convenience function to scrape Zillow URLs.

    Args:
        categories: Optional list of categories to filter
        manifest_path: Optional path for manifest

    Returns:
        List of link info dictionaries
    """
    scraper = ZillowScraper(manifest_path=manifest_path)

    if categories:
        links = scraper.generate_urls_for_categories(categories)
    else:
        links = scraper.generate_all_urls()

    return links

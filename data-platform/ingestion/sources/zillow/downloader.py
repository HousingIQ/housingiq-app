"""
Zillow Data Downloader - Download CSV files from Zillow Research.

Migrated from zillow_data_sc/downloader.py with improvements:
- Async HTTP with httpx for better performance
- Type hints throughout
- Configuration from config.py
- Structured logging
"""

from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING

import httpx

from .config import DEFAULT_CATEGORIES, DOWNLOAD_SETTINGS

if TYPE_CHECKING:
    pass


@dataclass
class DownloadStats:
    """Track download statistics."""

    total: int = 0
    success: int = 0
    failed: int = 0
    skipped: int = 0

    def to_dict(self) -> dict:
        return {
            "total": self.total,
            "success": self.success,
            "failed": self.failed,
            "skipped": self.skipped,
        }


@dataclass
class DownloadResult:
    """Result of a single download."""

    filename: str
    category: str
    status: str  # 'success', 'failed', 'skipped'
    path: str | None = None
    error: str | None = None


class ZillowDownloader:
    """Download Zillow data files with concurrent requests."""

    def __init__(
        self,
        output_dir: Path | str = "data",
        max_concurrent: int | None = None,
        timeout: int | None = None,
        skip_existing: bool = True,
    ) -> None:
        """
        Initialize downloader.

        Args:
            output_dir: Directory to save downloaded files
            max_concurrent: Max concurrent downloads (default from config)
            timeout: Request timeout in seconds (default from config)
            skip_existing: Skip files that already exist
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.max_concurrent = max_concurrent or DOWNLOAD_SETTINGS["max_concurrent"]
        self.timeout = timeout or DOWNLOAD_SETTINGS["timeout"]
        self.skip_existing = skip_existing
        self.retry_attempts = DOWNLOAD_SETTINGS["retry_attempts"]
        self.retry_delay = DOWNLOAD_SETTINGS["retry_delay"]

        self.stats = DownloadStats()
        self._results: list[DownloadResult] = []

    async def download_file(
        self,
        client: httpx.AsyncClient,
        url: str,
        category: str,
        filename: str,
        semaphore: asyncio.Semaphore,
    ) -> DownloadResult:
        """
        Download a single file.

        Args:
            client: HTTP client
            url: Download URL
            category: Category name (for subdirectory)
            filename: Target filename
            semaphore: Concurrency limiter

        Returns:
            DownloadResult with status
        """
        category_dir = self.output_dir / category
        category_dir.mkdir(parents=True, exist_ok=True)
        file_path = category_dir / filename

        # Skip if exists
        if self.skip_existing and file_path.exists():
            self.stats.skipped += 1
            return DownloadResult(
                filename=filename,
                category=category,
                status="skipped",
                path=str(file_path),
            )

        async with semaphore:
            for attempt in range(self.retry_attempts):
                try:
                    response = await client.get(url, timeout=self.timeout)
                    response.raise_for_status()

                    # Write content
                    file_path.write_bytes(response.content)

                    self.stats.success += 1
                    return DownloadResult(
                        filename=filename,
                        category=category,
                        status="success",
                        path=str(file_path),
                    )

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        # File doesn't exist for this geography
                        self.stats.failed += 1
                        return DownloadResult(
                            filename=filename,
                            category=category,
                            status="failed",
                            error=f"HTTP 404: Not found",
                        )
                    # Retry on other HTTP errors
                    if attempt < self.retry_attempts - 1:
                        await asyncio.sleep(self.retry_delay)
                        continue
                    self.stats.failed += 1
                    return DownloadResult(
                        filename=filename,
                        category=category,
                        status="failed",
                        error=f"HTTP {e.response.status_code}",
                    )

                except Exception as e:
                    if attempt < self.retry_attempts - 1:
                        await asyncio.sleep(self.retry_delay)
                        continue
                    self.stats.failed += 1
                    return DownloadResult(
                        filename=filename,
                        category=category,
                        status="failed",
                        error=str(e),
                    )

        # Should not reach here
        self.stats.failed += 1
        return DownloadResult(
            filename=filename,
            category=category,
            status="failed",
            error="Max retries exceeded",
        )

    async def download_batch(
        self,
        links: list[dict],
    ) -> list[DownloadResult]:
        """
        Download multiple files concurrently.

        Args:
            links: List of link info dictionaries

        Returns:
            List of DownloadResult objects
        """
        self.stats.total = len(links)
        self._results = []
        semaphore = asyncio.Semaphore(self.max_concurrent)

        headers = {
            "User-Agent": DOWNLOAD_SETTINGS["user_agent"],
        }

        async with httpx.AsyncClient(headers=headers) as client:
            tasks = [
                self.download_file(
                    client=client,
                    url=link["url"],
                    category=link["category"],
                    filename=link["filename"],
                    semaphore=semaphore,
                )
                for link in links
            ]

            # Process with progress tracking
            for coro in asyncio.as_completed(tasks):
                result = await coro
                self._results.append(result)

        return self._results

    def download_from_manifest(
        self,
        manifest_path: Path | str,
        categories: list[str] | None = None,
    ) -> DownloadStats:
        """
        Download files from a manifest.

        Args:
            manifest_path: Path to manifest.json
            categories: Optional list of categories to filter

        Returns:
            Download statistics
        """
        manifest_path = Path(manifest_path)
        if not manifest_path.exists():
            raise FileNotFoundError(f"Manifest not found: {manifest_path}")

        with open(manifest_path) as f:
            manifest = json.load(f)

        # Filter by categories
        links = manifest["all_links"]
        if categories:
            links = [l for l in links if l["category"] in categories]

        if not links:
            return self.stats

        # Run async download
        asyncio.run(self.download_batch(links))

        return self.stats

    def download_links(
        self,
        links: list[dict],
    ) -> DownloadStats:
        """
        Download a list of links directly.

        Args:
            links: List of link info dictionaries

        Returns:
            Download statistics
        """
        if not links:
            return self.stats

        asyncio.run(self.download_batch(links))
        return self.stats

    def get_storage_stats(self) -> dict:
        """Get storage statistics for downloaded files."""
        if not self.output_dir.exists():
            return {"total_size_mb": 0, "file_count": 0}

        files = list(self.output_dir.rglob("*.csv"))
        total_size = sum(f.stat().st_size for f in files)

        return {
            "total_size_mb": total_size / 1024 / 1024,
            "file_count": len(files),
        }

    def save_download_log(
        self,
        log_path: Path | str = "download_log.json",
    ) -> None:
        """Save detailed download log."""
        log = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "stats": self.stats.to_dict(),
            "results": [
                {
                    "filename": r.filename,
                    "category": r.category,
                    "status": r.status,
                    "path": r.path,
                    "error": r.error,
                }
                for r in self._results
            ],
        }

        with open(log_path, "w") as f:
            json.dump(log, f, indent=2)


def download_zillow_data(
    output_dir: Path | str = "data",
    categories: list[str] | None = None,
    skip_existing: bool = True,
) -> DownloadStats:
    """
    Convenience function to download Zillow data.

    Args:
        output_dir: Directory to save files
        categories: Categories to download (default from config)
        skip_existing: Skip existing files

    Returns:
        Download statistics
    """
    from .scraper import scrape_zillow_urls

    categories = categories or DEFAULT_CATEGORIES
    links = scrape_zillow_urls(categories=categories)

    downloader = ZillowDownloader(
        output_dir=output_dir,
        skip_existing=skip_existing,
    )

    return downloader.download_links(links)

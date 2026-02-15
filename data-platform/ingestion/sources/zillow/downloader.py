"""
Zillow Data Downloader - Download CSV files from Zillow Research.

Migrated from zillow_data_sc/downloader.py with improvements:
- Async HTTP with httpx for better performance
- Type hints throughout
- Configuration from config.py
- Structured logging
- Staleness-aware downloads (re-download files older than max_age_days)
- HTTP HEAD checks to detect remotely updated files
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import TYPE_CHECKING

import httpx

from .config import DEFAULT_CATEGORIES, DOWNLOAD_SETTINGS

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


@dataclass
class DownloadStats:
    """Track download statistics."""

    total: int = 0
    success: int = 0
    failed: int = 0
    skipped: int = 0
    updated: int = 0

    def to_dict(self) -> dict:
        return {
            "total": self.total,
            "success": self.success,
            "failed": self.failed,
            "skipped": self.skipped,
            "updated": self.updated,
        }


@dataclass
class DownloadResult:
    """Result of a single download."""

    filename: str
    category: str
    status: str  # 'success', 'failed', 'skipped', 'updated'
    path: str | None = None
    error: str | None = None
    local_modified: str | None = None
    remote_modified: str | None = None


@dataclass
class FreshnessCheck:
    """Result of checking whether a file needs updating."""

    filename: str
    category: str
    url: str
    local_path: Path | None = None
    exists_locally: bool = False
    local_modified: datetime | None = None
    remote_modified: datetime | None = None
    local_size: int | None = None
    remote_size: int | None = None
    needs_update: bool = True
    reason: str = "new"

    @property
    def local_age_days(self) -> float | None:
        """Days since local file was last modified."""
        if self.local_modified is None:
            return None
        delta = datetime.now(tz=timezone.utc) - self.local_modified
        return delta.total_seconds() / 86400


class ZillowDownloader:
    """Download Zillow data files with concurrent requests."""

    def __init__(
        self,
        output_dir: Path | str = "data/raw",
        max_concurrent: int | None = None,
        timeout: int | None = None,
        skip_existing: bool = False,
        max_age_days: int | None = 30,
    ) -> None:
        """
        Initialize downloader.

        Args:
            output_dir: Directory to save downloaded files
            max_concurrent: Max concurrent downloads (default from config)
            timeout: Request timeout in seconds (default from config)
            skip_existing: Skip files that already exist (ignores staleness)
            max_age_days: Re-download files older than this many days.
                          Set to None to always re-download.
                          Ignored when skip_existing=True.
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.max_concurrent = max_concurrent or DOWNLOAD_SETTINGS["max_concurrent"]
        self.timeout = timeout or DOWNLOAD_SETTINGS["timeout"]
        self.skip_existing = skip_existing
        self.max_age_days = max_age_days
        self.retry_attempts = DOWNLOAD_SETTINGS["retry_attempts"]
        self.retry_delay = DOWNLOAD_SETTINGS["retry_delay"]

        self.stats = DownloadStats()
        self._results: list[DownloadResult] = []

    def _is_file_stale(self, file_path: Path) -> bool:
        """
        Check if a local file is stale based on max_age_days.

        Args:
            file_path: Path to the local file

        Returns:
            True if the file should be re-downloaded
        """
        if not file_path.exists():
            return True

        if self.max_age_days is None:
            return True  # Always re-download

        mtime = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
        age_days = (datetime.now(tz=timezone.utc) - mtime).total_seconds() / 86400
        return age_days > self.max_age_days

    async def check_remote_modified(
        self,
        client: httpx.AsyncClient,
        url: str,
        semaphore: asyncio.Semaphore,
    ) -> datetime | None:
        """
        Check the Last-Modified header of a remote file via HTTP HEAD.

        Args:
            client: HTTP client
            url: Remote URL
            semaphore: Concurrency limiter

        Returns:
            Remote last-modified datetime, or None if unavailable
        """
        async with semaphore:
            try:
                response = await client.head(url, timeout=10)
                if response.status_code == 200:
                    last_mod = response.headers.get("Last-Modified")
                    if last_mod:
                        return parsedate_to_datetime(last_mod)
                    content_length = response.headers.get("Content-Length")
                    # Return None but we at least know the file exists remotely
                    return None
            except Exception:
                return None
        return None

    async def check_freshness(
        self,
        links: list[dict],
    ) -> list[FreshnessCheck]:
        """
        Check which files need updating by comparing local and remote state.

        Uses HTTP HEAD requests to get remote Last-Modified headers without
        downloading the full files.

        Args:
            links: List of link info dictionaries

        Returns:
            List of FreshnessCheck results
        """
        results: list[FreshnessCheck] = []
        semaphore = asyncio.Semaphore(self.max_concurrent)
        headers = {"User-Agent": DOWNLOAD_SETTINGS["user_agent"]}

        async with httpx.AsyncClient(headers=headers) as client:
            tasks = []
            link_map: dict[str, dict] = {}

            for link in links:
                url = link["url"]
                category = link["category"]
                filename = link["filename"]
                file_path = self.output_dir / category / filename

                check = FreshnessCheck(
                    filename=filename,
                    category=category,
                    url=url,
                    local_path=file_path,
                    exists_locally=file_path.exists(),
                )

                if file_path.exists():
                    stat = file_path.stat()
                    check.local_modified = datetime.fromtimestamp(
                        stat.st_mtime, tz=timezone.utc
                    )
                    check.local_size = stat.st_size

                link_map[url] = {"check": check}
                tasks.append((url, self.check_remote_modified(client, url, semaphore)))

            # Run all HEAD requests concurrently
            for url, coro in tasks:
                remote_mod = await coro
                check = link_map[url]["check"]
                check.remote_modified = remote_mod

                # Determine if update is needed
                if not check.exists_locally:
                    check.needs_update = True
                    check.reason = "new"
                elif self.skip_existing:
                    check.needs_update = False
                    check.reason = "skip_existing"
                elif (
                    check.remote_modified
                    and check.local_modified
                    and check.remote_modified > check.local_modified
                ):
                    check.needs_update = True
                    check.reason = "remote_newer"
                elif self._is_file_stale(check.local_path):
                    check.needs_update = True
                    check.reason = "stale"
                else:
                    check.needs_update = False
                    check.reason = "fresh"

                results.append(check)

        return results

    def check_freshness_sync(
        self,
        links: list[dict],
    ) -> list[FreshnessCheck]:
        """
        Synchronous wrapper for check_freshness.

        Args:
            links: List of link info dictionaries

        Returns:
            List of FreshnessCheck results
        """
        return asyncio.run(self.check_freshness(links))

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

        is_update = file_path.exists()
        local_mod_str: str | None = None

        # Determine whether to skip this file
        if file_path.exists():
            local_mod_str = datetime.fromtimestamp(
                file_path.stat().st_mtime, tz=timezone.utc
            ).strftime("%Y-%m-%d %H:%M:%S UTC")

            if self.skip_existing:
                self.stats.skipped += 1
                return DownloadResult(
                    filename=filename,
                    category=category,
                    status="skipped",
                    path=str(file_path),
                    local_modified=local_mod_str,
                )

            if not self._is_file_stale(file_path):
                self.stats.skipped += 1
                return DownloadResult(
                    filename=filename,
                    category=category,
                    status="skipped",
                    path=str(file_path),
                    local_modified=local_mod_str,
                )

        async with semaphore:
            for attempt in range(self.retry_attempts):
                try:
                    response = await client.get(url, timeout=self.timeout)
                    response.raise_for_status()

                    # Write content
                    file_path.write_bytes(response.content)

                    # Get remote Last-Modified for logging
                    remote_mod_str: str | None = None
                    last_mod = response.headers.get("Last-Modified")
                    if last_mod:
                        try:
                            remote_mod_str = parsedate_to_datetime(
                                last_mod
                            ).strftime("%Y-%m-%d %H:%M:%S UTC")
                        except Exception:
                            pass

                    if is_update:
                        self.stats.updated += 1
                        status = "updated"
                    else:
                        self.stats.success += 1
                        status = "success"

                    return DownloadResult(
                        filename=filename,
                        category=category,
                        status=status,
                        path=str(file_path),
                        local_modified=local_mod_str,
                        remote_modified=remote_mod_str,
                    )

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        # File doesn't exist for this geography
                        self.stats.failed += 1
                        return DownloadResult(
                            filename=filename,
                            category=category,
                            status="failed",
                            error="HTTP 404: Not found",
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
                    "local_modified": r.local_modified,
                    "remote_modified": r.remote_modified,
                }
                for r in self._results
            ],
        }

        with open(log_path, "w") as f:
            json.dump(log, f, indent=2)


def download_zillow_data(
    output_dir: Path | str = "data/raw",
    categories: list[str] | None = None,
    skip_existing: bool = False,
    max_age_days: int | None = 30,
) -> DownloadStats:
    """
    Convenience function to download Zillow data.

    Args:
        output_dir: Directory to save files
        categories: Categories to download (default from config)
        skip_existing: Skip existing files entirely (ignores staleness)
        max_age_days: Re-download files older than this. Default 30 days.

    Returns:
        Download statistics
    """
    from .scraper import scrape_zillow_urls

    categories = categories or DEFAULT_CATEGORIES
    links = scrape_zillow_urls(categories=categories)

    downloader = ZillowDownloader(
        output_dir=output_dir,
        skip_existing=skip_existing,
        max_age_days=max_age_days,
    )

    return downloader.download_links(links)

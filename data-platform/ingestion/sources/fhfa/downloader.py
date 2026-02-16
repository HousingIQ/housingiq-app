"""
FHFA HPI Data Downloader.

Simple downloader for the FHFA House Price Index master CSV file.
"""

from __future__ import annotations

import logging
from pathlib import Path

import httpx

from .config import DOWNLOAD_SETTINGS, MASTER_CSV_URL

logger = logging.getLogger(__name__)


class FHFADownloader:
    """Download FHFA HPI master CSV file."""

    def __init__(
        self,
        output_dir: Path | str = "data/raw/fhfa",
        timeout: int | None = None,
    ) -> None:
        """
        Initialize downloader.

        Args:
            output_dir: Directory to save the downloaded CSV file.
            timeout: Request timeout in seconds (default from config).
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = timeout or DOWNLOAD_SETTINGS["timeout"]

    def download(self) -> Path:
        """
        Download the FHFA HPI master CSV file.

        Returns:
            Path to the downloaded CSV file.

        Raises:
            httpx.HTTPStatusError: If the download fails after retries.
        """
        output_path = self.output_dir / "hpi_master.csv"

        headers = {"User-Agent": DOWNLOAD_SETTINGS["user_agent"]}
        retry_attempts = DOWNLOAD_SETTINGS["retry_attempts"]
        retry_delay = DOWNLOAD_SETTINGS["retry_delay"]

        for attempt in range(retry_attempts):
            try:
                logger.info(
                    "Downloading FHFA HPI master CSV (attempt %d/%d)...",
                    attempt + 1,
                    retry_attempts,
                )
                with httpx.Client(headers=headers, timeout=self.timeout) as client:
                    response = client.get(MASTER_CSV_URL)
                    response.raise_for_status()
                    output_path.write_bytes(response.content)

                size_mb = output_path.stat().st_size / (1024 * 1024)
                logger.info(
                    "Downloaded FHFA HPI master CSV: %.1f MB -> %s",
                    size_mb,
                    output_path,
                )
                return output_path

            except httpx.HTTPStatusError:
                if attempt < retry_attempts - 1:
                    import time

                    time.sleep(retry_delay)
                    continue
                raise
            except Exception:
                if attempt < retry_attempts - 1:
                    import time

                    time.sleep(retry_delay)
                    continue
                raise

        raise RuntimeError("Max retries exceeded downloading FHFA HPI data")


def download_fhfa_data(
    output_dir: Path | str = "data/raw/fhfa",
) -> Path:
    """
    Convenience function to download FHFA HPI data.

    Args:
        output_dir: Directory to save downloaded file.

    Returns:
        Path to the downloaded CSV file.
    """
    downloader = FHFADownloader(output_dir=output_dir)
    return downloader.download()

#!/usr/bin/env python3
"""
Check which Zillow data files need updating.

Performs HTTP HEAD requests to check remote Last-Modified headers
and compares with local file ages. No files are downloaded.

Usage:
    python scripts/check_freshness.py              # Default: 30-day threshold
    python scripts/check_freshness.py --max-age 7  # 7-day threshold
    python scripts/check_freshness.py --max-age 0  # Show all files
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from ingestion.sources.zillow import ZillowDownloader, ZillowScraper
from ingestion.sources.zillow.config import DEFAULT_CATEGORIES


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Check which Zillow data files need updating"
    )
    parser.add_argument(
        "--max-age",
        type=int,
        default=30,
        help="Max age in days before a file is considered stale (default: 30)",
    )
    parser.add_argument(
        "--category",
        type=str,
        default=None,
        help="Filter to a specific category (e.g. zhvi, zori)",
    )
    args = parser.parse_args()

    data_dir = Path("data/raw")
    categories = [args.category] if args.category else DEFAULT_CATEGORIES

    # Generate URLs
    scraper = ZillowScraper()
    links = scraper.generate_urls_for_categories(categories)

    print(f"Checking {len(links)} files across categories: {categories}")
    print(f"Max age threshold: {args.max_age} days")
    print(f"Performing HTTP HEAD requests to check remote timestamps...")
    print()

    # Check freshness
    downloader = ZillowDownloader(
        output_dir=data_dir,
        skip_existing=False,
        max_age_days=args.max_age,
    )
    checks = downloader.check_freshness_sync(links)

    # Group results
    needs_update: list = []
    fresh: list = []
    new_files: list = []

    for check in checks:
        if not check.exists_locally:
            new_files.append(check)
        elif check.needs_update:
            needs_update.append(check)
        else:
            fresh.append(check)

    # Print results
    now = datetime.now(tz=timezone.utc)

    if new_files:
        print(f"{'='*70}")
        print(f"  NEW FILES (not yet downloaded): {len(new_files)}")
        print(f"{'='*70}")
        for c in sorted(new_files, key=lambda x: (x.category, x.filename)):
            remote_str = c.remote_modified.strftime("%Y-%m-%d") if c.remote_modified else "unknown"
            print(f"  [{c.category}] {c.filename}")
            print(f"           remote: {remote_str}")
        print()

    if needs_update:
        print(f"{'='*70}")
        print(f"  STALE FILES (will be re-downloaded): {len(needs_update)}")
        print(f"{'='*70}")
        for c in sorted(needs_update, key=lambda x: (x.category, x.filename)):
            age = f"{c.local_age_days:.0f}" if c.local_age_days is not None else "?"
            local_str = c.local_modified.strftime("%Y-%m-%d") if c.local_modified else "unknown"
            remote_str = c.remote_modified.strftime("%Y-%m-%d") if c.remote_modified else "unknown"
            print(f"  [{c.category}] {c.filename}")
            print(f"           local: {local_str} ({age}d old)  |  remote: {remote_str}  |  reason: {c.reason}")
        print()

    if fresh:
        print(f"{'='*70}")
        print(f"  FRESH FILES (no update needed): {len(fresh)}")
        print(f"{'='*70}")
        for c in sorted(fresh, key=lambda x: (x.category, x.filename)):
            age = f"{c.local_age_days:.0f}" if c.local_age_days is not None else "?"
            print(f"  [{c.category}] {c.filename}  ({age}d old)")
        print()

    # Summary
    print(f"{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Total files checked:  {len(checks)}")
    print(f"  New (to download):    {len(new_files)}")
    print(f"  Stale (to update):    {len(needs_update)}")
    print(f"  Fresh (skip):         {len(fresh)}")
    print()

    if needs_update or new_files:
        total_action = len(needs_update) + len(new_files)
        print(f"  -> {total_action} files will be downloaded on next 'make materialize'")
    else:
        print(f"  -> All files are up to date!")


if __name__ == "__main__":
    main()

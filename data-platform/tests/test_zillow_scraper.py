"""
Tests for Zillow URL scraper.
"""

from pathlib import Path

from ingestion.sources.zillow.scraper import ZillowScraper, scrape_zillow_urls


class TestZillowScraper:
    """Tests for ZillowScraper class."""

    def test_generate_all_urls(self):
        """Test that all URLs are generated correctly."""
        scraper = ZillowScraper()
        links = scraper.generate_all_urls()

        assert len(links) > 0
        assert all("url" in link for link in links)
        assert all("category" in link for link in links)
        assert all("filename" in link for link in links)
        assert all("geography" in link for link in links)

    def test_generate_urls_for_categories(self):
        """Test URL generation for specific categories."""
        scraper = ZillowScraper()
        categories = ["zhvi"]
        links = scraper.generate_urls_for_categories(categories)

        assert len(links) > 0
        assert all(link["category"] == "zhvi" for link in links)

    def test_url_format(self):
        """Test that URLs have correct format."""
        scraper = ZillowScraper()
        links = scraper.generate_all_urls()

        for link in links[:10]:  # Check first 10
            url = link["url"]
            assert url.startswith("https://files.zillowstatic.com/research/public_csvs/")
            assert url.endswith(".csv")

    def test_url_hash_uniqueness(self):
        """Test that URL hashes are unique."""
        scraper = ZillowScraper()
        links = scraper.generate_all_urls()

        hashes = [link["url_hash"] for link in links]
        assert len(hashes) == len(set(hashes)), "URL hashes should be unique"

    def test_save_and_load_manifest(self, tmp_path: Path):
        """Test saving and loading manifest."""
        scraper = ZillowScraper(manifest_path=tmp_path / "manifest.json")
        links = scraper.generate_urls_for_categories(["zhvi"])

        # Save
        manifest = scraper.save_manifest(links)
        assert manifest["total_links"] == len(links)

        # Load
        loaded = scraper.load_manifest()
        assert loaded["total_links"] == len(links)
        assert len(loaded["all_links"]) == len(links)

    def test_get_new_links(self, tmp_path: Path):
        """Test detecting new links."""
        manifest_path = tmp_path / "manifest.json"
        scraper = ZillowScraper(manifest_path=manifest_path)

        # First run - all links are new
        links_v1 = scraper.generate_urls_for_categories(["zhvi"])[:5]
        scraper.save_manifest(links_v1)

        # Second run with same links - none are new
        new_links = scraper.get_new_links(links_v1)
        assert len(new_links) == 0

        # Add more links - those should be new
        links_v2 = scraper.generate_urls_for_categories(["zhvi"])[:10]
        new_links = scraper.get_new_links(links_v2)
        assert len(new_links) == 5

    def test_get_summary(self):
        """Test summary generation."""
        scraper = ZillowScraper()
        links = scraper.generate_all_urls()
        summary = scraper.get_summary(links)

        assert "total_files" in summary
        assert "total_categories" in summary
        assert "by_category" in summary
        assert summary["total_files"] == len(links)


class TestScrapeZillowUrls:
    """Tests for convenience function."""

    def test_scrape_all(self):
        """Test scraping all URLs."""
        links = scrape_zillow_urls()
        assert len(links) > 0

    def test_scrape_with_categories(self):
        """Test scraping with category filter."""
        links = scrape_zillow_urls(categories=["zori"])
        assert len(links) > 0
        assert all(link["category"] == "zori" for link in links)

"""
Tests for Zillow Pydantic schemas.
"""

from datetime import date, datetime

import pytest
from pydantic import ValidationError

from ingestion.sources.zillow.schemas import (
    DownloadResult,
    DownloadStats,
    LinkInfo,
    ProcessingResult,
    Region,
    ZHVIValue,
    ZORIValue,
)


class TestLinkInfo:
    """Tests for LinkInfo schema."""

    def test_valid_link_info(self):
        """Test creating valid LinkInfo."""
        link = LinkInfo(
            url="https://example.com/data.csv",
            category="zhvi",
            filename="Metro_zhvi.csv",
            geography="Metro",
            description="Test data",
            pattern_name="zhvi_all_sm_sa",
            url_hash="abc123",
        )

        assert link.url == "https://example.com/data.csv"
        assert link.category == "zhvi"

    def test_missing_required_field(self):
        """Test that missing required fields raise error."""
        with pytest.raises(ValidationError):
            LinkInfo(
                url="https://example.com/data.csv",
                # Missing other required fields
            )


class TestRegion:
    """Tests for Region schema."""

    def test_valid_region(self):
        """Test creating valid Region."""
        region = Region(
            region_id="12345",
            region_name="San Francisco",
            geography_level="Metro",
            state_code="CA",
            state_name="California",
        )

        assert region.region_id == "12345"
        assert region.geography_level == "Metro"

    def test_invalid_geography_level(self):
        """Test that invalid geography level raises error."""
        with pytest.raises(ValidationError):
            Region(
                region_id="12345",
                region_name="Test",
                geography_level="InvalidLevel",  # Not a valid Literal
            )


class TestZHVIValue:
    """Tests for ZHVIValue schema."""

    def test_valid_zhvi_value(self):
        """Test creating valid ZHVIValue."""
        value = ZHVIValue(
            region_id="12345",
            date=date(2023, 1, 31),
            value=1200000.0,
            geography_level="Metro",
            home_type="All Homes",
            tier="Mid-Tier",
            smoothed=True,
            seasonally_adjusted=True,
        )

        assert value.region_id == "12345"
        assert value.value == 1200000.0
        assert value.home_type == "All Homes"

    def test_optional_bedrooms(self):
        """Test that bedrooms is optional."""
        value = ZHVIValue(
            region_id="12345",
            date=date(2023, 1, 31),
            value=1200000.0,
            geography_level="Metro",
            home_type="All Homes",
            tier="Mid-Tier",
            bedrooms=3,
        )

        assert value.bedrooms == 3


class TestZORIValue:
    """Tests for ZORIValue schema."""

    def test_valid_zori_value(self):
        """Test creating valid ZORIValue."""
        value = ZORIValue(
            region_id="12345",
            date=date(2023, 1, 31),
            value=3500.0,
            geography_level="Metro",
            home_type="All Homes Plus Multifamily",
        )

        assert value.region_id == "12345"
        assert value.value == 3500.0


class TestDownloadResult:
    """Tests for DownloadResult schema."""

    def test_success_result(self):
        """Test successful download result."""
        result = DownloadResult(
            filename="test.csv",
            category="zhvi",
            status="success",
            path="/data/zhvi/test.csv",
        )

        assert result.status == "success"
        assert result.error is None

    def test_failed_result(self):
        """Test failed download result."""
        result = DownloadResult(
            filename="test.csv",
            category="zhvi",
            status="failed",
            error="HTTP 404",
        )

        assert result.status == "failed"
        assert result.error == "HTTP 404"


class TestDownloadStats:
    """Tests for DownloadStats schema."""

    def test_default_values(self):
        """Test default values."""
        stats = DownloadStats()

        assert stats.total == 0
        assert stats.success == 0
        assert stats.failed == 0
        assert stats.skipped == 0

    def test_custom_values(self):
        """Test with custom values."""
        stats = DownloadStats(
            total=100,
            success=90,
            failed=5,
            skipped=5,
        )

        assert stats.total == 100
        assert stats.success == 90


class TestProcessingResult:
    """Tests for ProcessingResult schema."""

    def test_valid_result(self):
        """Test valid processing result."""
        result = ProcessingResult(
            category="zhvi",
            files_processed=10,
            regions_count=1000,
            values_count=50000,
            duration_seconds=30.5,
        )

        assert result.category == "zhvi"
        assert result.files_processed == 10
        assert result.errors == []

    def test_with_errors(self):
        """Test processing result with errors."""
        result = ProcessingResult(
            category="zhvi",
            files_processed=8,
            regions_count=800,
            values_count=40000,
            errors=["Failed to process file1.csv", "Failed to process file2.csv"],
        )

        assert len(result.errors) == 2

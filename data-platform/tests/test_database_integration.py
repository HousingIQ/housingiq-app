"""
Database integration tests.

These tests exercise the database.py loading assets against a real
PostgreSQL instance (the one from Docker Compose).

Marked with ``@pytest.mark.integration`` so they can be skipped when
no database is available::

    pytest -m "not integration"     # skip DB tests
    pytest -m integration           # run only DB tests

Requires:
    DATABASE_URL env var pointing to a running PostgreSQL instance.
"""

import os
from pathlib import Path

import polars as pl
import pytest
from dagster import build_asset_context
from sqlalchemy import create_engine, text

from housingiq_dagster.assets.database import (
    app_affordability_metrics,
    app_inventory_values,
    app_market_heat_index,
    app_market_summary,
    app_regions,
    app_zhvi_values,
    app_zori_values,
    drop_and_create_table,
    ensure_app_schema,
    get_postgres_connection_string,
)

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def postgres_url() -> str:
    """Resolve PostgreSQL connection string from environment."""
    url = os.getenv(
        "DATABASE_URL",
        "postgresql://housingiq:housingiq@localhost:5432/housingiq",
    )
    # Verify connectivity
    engine = create_engine(url)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")
    finally:
        engine.dispose()
    return url


@pytest.fixture(autouse=True)
def cleanup_test_tables(postgres_url: str):
    """Drop any test tables created during the test."""
    yield
    engine = create_engine(postgres_url)
    tables = [
        "app.regions", "app.zhvi_values", "app.zori_values",
        "app.market_summary", "app.inventory_values",
        "app.market_heat_index", "app.affordability_metrics",
    ]
    with engine.connect() as conn:
        for table in tables:
            conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
        conn.commit()
    engine.dispose()


def _read_table(postgres_url: str, table_name: str) -> pl.DataFrame:
    """Read a PostgreSQL table into a Polars DataFrame."""
    engine = create_engine(postgres_url)
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM {table_name}"))
        columns = list(result.keys())
        rows = result.fetchall()
    engine.dispose()
    return pl.DataFrame(
        {col: [row[i] for row in rows] for i, col in enumerate(columns)}
    )


def _table_exists(postgres_url: str, table_name: str) -> bool:
    """Check if a table exists in PostgreSQL."""
    schema, name = table_name.split(".")
    engine = create_engine(postgres_url)
    with engine.connect() as conn:
        result = conn.execute(
            text(
                "SELECT EXISTS ("
                "  SELECT 1 FROM information_schema.tables "
                "  WHERE table_schema = :schema AND table_name = :name"
                ")"
            ),
            {"schema": schema, "name": name},
        )
        exists = result.scalar()
    engine.dispose()
    return bool(exists)


# ============================================================================
# Low-level helpers
# ============================================================================


class TestEnsureAppSchema:
    """Tests for schema creation helper."""

    def test_creates_app_schema(self, postgres_url: str):
        """Should create the app schema without error."""
        ensure_app_schema()

        engine = create_engine(postgres_url)
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    "SELECT schema_name FROM information_schema.schemata "
                    "WHERE schema_name = 'app'"
                )
            )
            assert result.fetchone() is not None
        engine.dispose()


class TestDropAndCreateTable:
    """Tests for the drop-and-replace table helper."""

    def test_creates_table_from_dataframe(self, postgres_url: str):
        """Should create a table matching the DataFrame schema."""
        ensure_app_schema()

        df = pl.DataFrame({
            "id": [1, 2, 3],
            "name": ["a", "b", "c"],
            "value": [1.0, 2.0, 3.0],
        })
        drop_and_create_table("app.test_table", df)

        assert _table_exists(postgres_url, "app.test_table")

        loaded = _read_table(postgres_url, "app.test_table")
        assert len(loaded) == 3

        # Cleanup
        engine = create_engine(postgres_url)
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS app.test_table"))
            conn.commit()
        engine.dispose()

    def test_replaces_existing_table(self, postgres_url: str):
        """Should drop and recreate if table already exists."""
        ensure_app_schema()

        df1 = pl.DataFrame({"id": [1, 2]})
        drop_and_create_table("app.test_replace", df1)

        df2 = pl.DataFrame({"id": [10, 20, 30]})
        drop_and_create_table("app.test_replace", df2)

        loaded = _read_table(postgres_url, "app.test_replace")
        assert len(loaded) == 3

        # Cleanup
        engine = create_engine(postgres_url)
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS app.test_replace"))
            conn.commit()
        engine.dispose()


# ============================================================================
# Asset-level tests
# ============================================================================


class TestAppRegionsAsset:
    """Tests for the app_regions database loading asset."""

    def test_loads_regions_to_postgres(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, postgres_url: str,
    ):
        """Should load dimension_regions parquet to app.regions table."""
        mart_dir = tmp_path / "mart"
        mart_dir.mkdir()
        monkeypatch.setattr("housingiq_dagster.assets.database.MART_DIR", mart_dir)

        # Write a minimal regions parquet
        df = pl.DataFrame({
            "region_id": ["1", "2"],
            "region_name": ["California", "Texas"],
            "display_name": ["California", "Texas"],
            "geography_level": ["State", "State"],
            "state_code": ["CA", "TX"],
            "state_name": ["California", "Texas"],
            "city": ["", ""],
            "county_name": ["", ""],
            "metro": ["", ""],
            "size_rank": [1, 2],
        })
        df.write_parquet(mart_dir / "dimension_regions.parquet")

        context = build_asset_context()
        result = app_regions(context)

        assert result.metadata["row_count"].value == 2
        assert _table_exists(postgres_url, "app.regions")

        loaded = _read_table(postgres_url, "app.regions")
        assert len(loaded) == 2


class TestAppZhviValuesAsset:
    """Tests for the app_zhvi_values database loading asset."""

    def test_loads_zhvi_to_postgres(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
        postgres_url: str, sample_zhvi_fact_df: pl.DataFrame,
    ):
        """Should load ZHVI fact parquet to app.zhvi_values table."""
        from housingiq_dagster.transforms_logic import compute_yoy_mom_changes

        mart_dir = tmp_path / "mart"
        mart_dir.mkdir()
        monkeypatch.setattr("housingiq_dagster.assets.database.MART_DIR", mart_dir)

        transformed = compute_yoy_mom_changes(
            sample_zhvi_fact_df,
            partition_cols=["region_id", "home_type", "tier", "bedrooms"],
            sort_cols=["region_id", "home_type", "tier", "bedrooms", "date"],
        )
        transformed.write_parquet(mart_dir / "fact_zhvi_values.parquet")

        context = build_asset_context()
        result = app_zhvi_values(context)

        assert result.metadata["row_count"].value == len(transformed)
        assert _table_exists(postgres_url, "app.zhvi_values")


class TestAppZoriValuesAsset:
    """Tests for the app_zori_values database loading asset."""

    def test_loads_zori_to_postgres(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
        postgres_url: str, sample_zori_fact_df: pl.DataFrame,
    ):
        """Should load ZORI fact parquet to app.zori_values table."""
        from housingiq_dagster.transforms_logic import compute_yoy_mom_changes

        mart_dir = tmp_path / "mart"
        mart_dir.mkdir()
        monkeypatch.setattr("housingiq_dagster.assets.database.MART_DIR", mart_dir)

        transformed = compute_yoy_mom_changes(
            sample_zori_fact_df,
            partition_cols=["region_id", "home_type"],
            sort_cols=["region_id", "home_type", "date"],
        )
        transformed.write_parquet(mart_dir / "fact_zori_values.parquet")

        context = build_asset_context()
        result = app_zori_values(context)

        assert result.metadata["row_count"].value == len(transformed)
        assert _table_exists(postgres_url, "app.zori_values")


class TestAppMarketSummaryAsset:
    """Tests for the app_market_summary database loading asset."""

    def test_loads_summary_to_postgres(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, postgres_url: str,
    ):
        """Should load market summary parquet to app.market_summary table."""
        from datetime import date

        mart_dir = tmp_path / "mart"
        mart_dir.mkdir()
        monkeypatch.setattr("housingiq_dagster.assets.database.MART_DIR", mart_dir)

        df = pl.DataFrame({
            "region_id": ["1"],
            "region_name": ["Test"],
            "display_name": ["Test Area"],
            "geography_level": ["Metro"],
            "state_code": ["CA"],
            "state_name": ["California"],
            "metro": ["Test"],
            "size_rank": [1],
            "current_home_value": [500_000.0],
            "home_value_yoy_pct": [5.0],
            "home_value_mom_pct": [0.5],
            "home_value_date": [date(2024, 1, 31)],
            "current_rent_value": [2_500.0],
            "rent_yoy_pct": [3.0],
            "rent_mom_pct": [0.3],
            "rent_value_date": [date(2024, 1, 31)],
            "price_to_rent_ratio": [16.67],
            "gross_rent_yield_pct": [6.0],
            "market_classification": ["Warm"],
        })
        df.write_parquet(mart_dir / "market_summary.parquet")

        context = build_asset_context()
        result = app_market_summary(context)

        assert result.metadata["row_count"].value == 1
        assert _table_exists(postgres_url, "app.market_summary")


class TestAppInventoryValuesAsset:
    """Tests for the app_inventory_values database loading asset."""

    def test_loads_inventory_to_postgres(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, postgres_url: str,
    ):
        """Should load inventory fact parquet to app.inventory_values table."""
        from datetime import date

        mart_dir = tmp_path / "mart"
        mart_dir.mkdir()
        monkeypatch.setattr("housingiq_dagster.assets.database.MART_DIR", mart_dir)

        df = pl.DataFrame({
            "region_id": ["1", "1"],
            "date": [date(2023, 1, 31), date(2023, 2, 28)],
            "inventory_count": [500, 520],
            "geography_level": ["Metro", "Metro"],
            "home_type": ["All Homes", "All Homes"],
            "smoothed": [True, True],
            "frequency": ["monthly", "monthly"],
            "mom_change_pct": [None, 4.0],
            "yoy_change_pct": [None, None],
        })
        df.write_parquet(mart_dir / "fact_inventory_values.parquet")

        context = build_asset_context()
        result = app_inventory_values(context)

        assert result.metadata["row_count"].value == 2
        assert _table_exists(postgres_url, "app.inventory_values")


class TestAppMarketHeatIndexAsset:
    """Tests for the app_market_heat_index database loading asset."""

    def test_loads_heat_index_to_postgres(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, postgres_url: str,
    ):
        """Should load heat index parquet to app.market_heat_index table."""
        from datetime import date

        mart_dir = tmp_path / "mart"
        mart_dir.mkdir()
        monkeypatch.setattr("housingiq_dagster.assets.database.MART_DIR", mart_dir)

        df = pl.DataFrame({
            "region_id": ["1", "1"],
            "date": [date(2023, 1, 31), date(2023, 2, 28)],
            "heat_index": [75.0, 78.0],
            "geography_level": ["Metro", "Metro"],
            "mom_change": [None, 3.0],
            "yoy_change": [None, None],
            "market_temperature": ["Warm", "Warm"],
        })
        df.write_parquet(mart_dir / "fact_market_heat_index.parquet")

        context = build_asset_context()
        result = app_market_heat_index(context)

        assert result.metadata["row_count"].value == 2
        assert _table_exists(postgres_url, "app.market_heat_index")


class TestAppAffordabilityMetricsAsset:
    """Tests for the app_affordability_metrics database loading asset."""

    def test_loads_affordability_to_postgres(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, postgres_url: str,
    ):
        """Should load affordability parquet to app.affordability_metrics table."""
        from datetime import date

        mart_dir = tmp_path / "mart"
        mart_dir.mkdir()
        monkeypatch.setattr("housingiq_dagster.assets.database.MART_DIR", mart_dir)

        df = pl.DataFrame({
            "region_id": ["1", "1"],
            "date": [date(2023, 1, 31), date(2023, 2, 28)],
            "value": [5200.0, 5250.0],
            "geography_level": ["Metro", "Metro"],
            "metric_type": ["mortgage_payment", "mortgage_payment"],
            "down_payment_pct": [20.0, 20.0],
            "mom_change_pct": [None, 0.96],
            "yoy_change_pct": [None, None],
        })
        df.write_parquet(mart_dir / "fact_affordability_metrics.parquet")

        context = build_asset_context()
        result = app_affordability_metrics(context)

        assert result.metadata["row_count"].value == 2
        assert _table_exists(postgres_url, "app.affordability_metrics")

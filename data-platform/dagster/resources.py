"""
Dagster Resources.

Shared resources for the HousingIQ data platform.
"""

import os
from pathlib import Path
from urllib.parse import urlparse

from dagster import ConfigurableResource
from dagster_dbt import DbtCliResource
from pydantic import Field


def parse_database_url(url: str) -> dict:
    """Parse DATABASE_URL into components."""
    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/") or "housingiq",
        "user": parsed.username or "housingiq",
        "password": parsed.password or "housingiq",
    }


# Default DATABASE_URL
DEFAULT_DATABASE_URL = "postgresql://housingiq:housingiq@localhost:5432/housingiq"


class PostgresResource(ConfigurableResource):
    """PostgreSQL database connection resource."""

    connection_string: str = Field(
        default=DEFAULT_DATABASE_URL,
        description="PostgreSQL connection string (DATABASE_URL format)",
    )

    @property
    def parsed(self) -> dict:
        return parse_database_url(self.connection_string)

    @property
    def host(self) -> str:
        return self.parsed["host"]

    @property
    def port(self) -> int:
        return self.parsed["port"]

    @property
    def database(self) -> str:
        return self.parsed["database"]

    @property
    def user(self) -> str:
        return self.parsed["user"]

    @property
    def password(self) -> str:
        return self.parsed["password"]


class DataDirectoryResource(ConfigurableResource):
    """Data directory paths resource."""

    base_dir: str = Field(default="data")

    @property
    def raw_dir(self) -> Path:
        return Path(self.base_dir)

    @property
    def processed_dir(self) -> Path:
        return Path(self.base_dir) / "processed"

    def ensure_dirs(self) -> None:
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)


# dbt resource configuration
DBT_PROJECT_DIR = Path(__file__).parent.parent / "dbt"

dbt_resource = DbtCliResource(
    project_dir=str(DBT_PROJECT_DIR),
    profiles_dir=str(DBT_PROJECT_DIR),
)


# Default resource configuration
default_resources = {
    "postgres": PostgresResource(
        connection_string=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL),
    ),
    "data_dirs": DataDirectoryResource(
        base_dir=os.getenv("DATA_DIR", "data"),
    ),
    "dbt": dbt_resource,
}

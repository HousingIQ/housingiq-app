"""
dbt Assets.

Software-defined assets for dbt models using dagster-dbt integration.
"""

from pathlib import Path

from dagster import AssetExecutionContext, AssetKey
from dagster_dbt import DbtCliResource, dbt_assets

# Path to dbt project
DBT_PROJECT_DIR = Path(__file__).parent.parent.parent / "dbt"
DBT_PROFILES_DIR = DBT_PROJECT_DIR


@dbt_assets(
    manifest=DBT_PROJECT_DIR / "target" / "manifest.json",
    project=DbtCliResource(
        project_dir=str(DBT_PROJECT_DIR),
        profiles_dir=str(DBT_PROFILES_DIR),
    ),
)
def housingiq_dbt_assets(context: AssetExecutionContext, dbt: DbtCliResource):
    """
    dbt models as Dagster assets.

    This function loads all dbt models from the manifest and exposes
    them as software-defined assets with automatic lineage.
    """
    yield from dbt.cli(["build"], context=context).stream()

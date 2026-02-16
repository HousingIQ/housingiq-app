"""
FHFA HPI Dagster Assets.

Software-defined assets for downloading, transforming, and loading
FHFA House Price Index data into the application database.

Asset lineage:
    fhfa_raw_file (ingestion)
        -> fhfa_hpi_transformed (transforms)
            -> app_fhfa_hpi (app_database)
"""

import polars as pl
from dagster import AssetExecutionContext, MaterializeResult, MetadataValue, asset

from ..metadata import build_column_lineage, polars_metadata
from ..paths import RAW_DIR, STAGING_DIR


@asset(
    group_name="ingestion",
    description="Download FHFA HPI master CSV file",
    compute_kind="download",
)
def fhfa_raw_file(context: AssetExecutionContext) -> MaterializeResult:
    """
    Download the FHFA House Price Index master CSV.

    Source: https://www.fhfa.gov/hpi/download/monthly/hpi_master.csv
    """
    from ingestion.sources.fhfa import FHFADownloader

    output_dir = RAW_DIR / "fhfa"
    downloader = FHFADownloader(output_dir=output_dir)

    try:
        output_path = downloader.download()
        file_size_mb = output_path.stat().st_size / (1024 * 1024)

        context.log.info(f"Downloaded FHFA HPI: {file_size_mb:.1f} MB -> {output_path}")

        return MaterializeResult(
            metadata={
                "file_path": MetadataValue.path(str(output_path)),
                "file_size_mb": MetadataValue.float(round(file_size_mb, 2)),
            }
        )
    except Exception as e:
        context.log.error(f"Failed to download FHFA HPI: {e}")
        raise


@asset(
    group_name="transforms",
    description="Transform FHFA HPI data to normalized Parquet",
    deps=["fhfa_raw_file"],
    compute_kind="polars",
)
def fhfa_hpi_transformed(context: AssetExecutionContext) -> MaterializeResult:
    """
    Filter and normalize FHFA HPI master CSV.

    Filters to:
    - hpi_type: purchase-only
    - frequency: monthly, quarterly
    - level: USA, State, MSA

    Normalizes yr+period into proper date column.
    """
    from ingestion.sources.fhfa import FHFATransformer

    input_path = RAW_DIR / "fhfa" / "hpi_master.csv"

    if not input_path.exists():
        context.log.warning(f"FHFA raw file not found: {input_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    STAGING_DIR.mkdir(parents=True, exist_ok=True)
    transformer = FHFATransformer(
        input_path=input_path,
        output_dir=STAGING_DIR,
    )

    df = transformer.transform()
    output_path = transformer.save_to_parquet(df)

    context.log.info(f"Transformed FHFA HPI: {len(df):,} rows -> {output_path}")

    return MaterializeResult(
        metadata=polars_metadata(
            df,
            extra={
                "levels": MetadataValue.json(
                    df["level"].unique().to_list()
                ),
                "frequencies": MetadataValue.json(
                    df["frequency"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    "level": [("fhfa_raw_file", "level")],
                    "place_name": [("fhfa_raw_file", "place_name")],
                    "place_id": [("fhfa_raw_file", "place_id")],
                    "date": [
                        ("fhfa_raw_file", "yr"),
                        ("fhfa_raw_file", "period"),
                    ],
                    "index_nsa": [("fhfa_raw_file", "index_nsa")],
                    "index_sa": [("fhfa_raw_file", "index_sa")],
                    "hpi_type": [("fhfa_raw_file", "hpi_type")],
                    "frequency": [("fhfa_raw_file", "frequency")],
                }),
            },
        )
    )


@asset(
    group_name="app_database",
    description="Load FHFA HPI to app.fhfa_hpi table",
    deps=["fhfa_hpi_transformed"],
    compute_kind="postgres",
)
def app_fhfa_hpi(context: AssetExecutionContext) -> MaterializeResult:
    """
    Load FHFA HPI data to PostgreSQL for the webapp.
    """
    from .database import drop_and_create_table, ensure_app_schema

    hpi_path = STAGING_DIR / "fhfa_hpi.parquet"

    if not hpi_path.exists():
        context.log.warning(f"FHFA HPI file not found: {hpi_path}")
        return MaterializeResult(metadata={"status": "no_data"})

    df = pl.read_parquet(hpi_path)

    ensure_app_schema()

    context.log.info(f"Loading {len(df):,} rows to app.fhfa_hpi...")
    drop_and_create_table("app.fhfa_hpi", df)

    context.log.info(f"Loaded {len(df):,} rows to app.fhfa_hpi")

    return MaterializeResult(
        metadata=polars_metadata(
            df,
            extra={
                "levels": MetadataValue.json(
                    df["level"].unique().to_list()
                ),
                "dagster/column_lineage": build_column_lineage({
                    col: [("fhfa_hpi_transformed", col)]
                    for col in df.columns
                }),
            },
        )
    )

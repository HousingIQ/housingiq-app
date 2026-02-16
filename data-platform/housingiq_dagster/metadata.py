"""
Dagster Metadata Utilities for Polars DataFrames.

Auto-generates rich metadata (TableSchema, data preview, null counts, etc.)
so every asset's output is fully inspectable in the Dagster UI.
"""

from __future__ import annotations

import polars as pl
from dagster import (
    MetadataValue,
    TableColumn,
    TableColumnDep,
    TableColumnLineage,
    TableSchema,
)


def polars_schema_metadata(df: pl.DataFrame) -> TableSchema:
    """Build a Dagster ``TableSchema`` from a Polars DataFrame.

    Each column's Polars dtype is converted to a human-readable string type.

    Args:
        df: Any Polars DataFrame.

    Returns:
        A ``TableSchema`` ready to attach as ``dagster/column_schema``.
    """
    return TableSchema(
        columns=[
            TableColumn(name=col, type=str(dtype))
            for col, dtype in df.schema.items()
        ]
    )


def polars_preview_markdown(df: pl.DataFrame, rows: int = 5) -> str:
    """Render the first *rows* of a Polars DataFrame as a Markdown table.

    Args:
        df: Any Polars DataFrame.
        rows: Number of rows to include (default 5).

    Returns:
        A Markdown string with a table preview.
    """
    sample = df.head(rows)
    headers = sample.columns
    header_row = "| " + " | ".join(headers) + " |"
    separator = "| " + " | ".join("---" for _ in headers) + " |"

    data_rows: list[str] = []
    for row in sample.iter_rows():
        formatted = []
        for val in row:
            if val is None:
                formatted.append("*null*")
            elif isinstance(val, float):
                formatted.append(f"{val:,.2f}")
            elif isinstance(val, int) and abs(val) > 9999:
                formatted.append(f"{val:,}")
            else:
                formatted.append(str(val))
        data_rows.append("| " + " | ".join(formatted) + " |")

    return "\n".join([header_row, separator, *data_rows])


def polars_null_counts(df: pl.DataFrame) -> dict[str, int]:
    """Count null values per column.

    Args:
        df: Any Polars DataFrame.

    Returns:
        Dict mapping column name to null count (only columns with nulls > 0).
    """
    null_counts = df.null_count().to_dicts()[0]
    return {col: count for col, count in null_counts.items() if count > 0}


def polars_metadata(
    df: pl.DataFrame,
    *,
    preview_rows: int = 5,
    include_date_range: bool = True,
    date_col: str = "date",
    extra: dict | None = None,
) -> dict:
    """Auto-generate comprehensive Dagster metadata from a Polars DataFrame.

    Produces:
    - ``dagster/column_schema`` : full column schema visible in Dagster catalog
    - ``row_count``             : total number of rows
    - ``num_columns``           : total number of columns
    - ``preview``               : Markdown table with first *preview_rows* rows
    - ``null_counts``           : columns with null values (JSON)
    - ``date_range``            : min→max date (if *date_col* exists)

    Args:
        df: The Polars DataFrame to inspect.
        preview_rows: Number of rows in the Markdown preview table.
        include_date_range: Whether to include date range if date column exists.
        date_col: Name of the date column.
        extra: Additional metadata entries to merge in.

    Returns:
        Dict of metadata key→MetadataValue pairs, ready for ``MaterializeResult``.
    """
    metadata: dict = {
        "dagster/column_schema": polars_schema_metadata(df),
        "row_count": MetadataValue.int(len(df)),
        "num_columns": MetadataValue.int(len(df.columns)),
        "preview": MetadataValue.md(polars_preview_markdown(df, preview_rows)),
    }

    # Null counts
    nulls = polars_null_counts(df)
    if nulls:
        metadata["null_counts"] = MetadataValue.json(nulls)

    # Date range
    if include_date_range and date_col in df.columns:
        date_min = df[date_col].min()
        date_max = df[date_col].max()
        metadata["date_range"] = MetadataValue.text(f"{date_min} to {date_max}")

    # Merge any extra metadata
    if extra:
        metadata.update(extra)

    return metadata


def build_column_lineage(
    deps_by_column: dict[str, list[tuple[str, str]]],
) -> TableColumnLineage:
    """Build a Dagster ``TableColumnLineage`` from a simplified mapping.

    Converts a dict of ``{output_col: [(asset_key, input_col), ...]}``
    into the Dagster ``TableColumnLineage`` format.

    Example::

        build_column_lineage({
            "yoy_change_pct": [("zillow_zhvi_transformed", "value")],
            "region_id":      [("zillow_zhvi_transformed", "region_id")],
        })

    Args:
        deps_by_column: Mapping of output column name to list of
            (upstream_asset_key, upstream_column_name) tuples.

    Returns:
        A ``TableColumnLineage`` ready to attach as ``dagster/column_lineage``.
    """
    return TableColumnLineage(
        deps_by_column={
            out_col: [
                TableColumnDep(asset_key=asset_key, column_name=col_name)
                for asset_key, col_name in deps
            ]
            for out_col, deps in deps_by_column.items()
        }
    )

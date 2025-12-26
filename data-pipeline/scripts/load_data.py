"""
ETL script to load Zillow data from parquet files to PostgreSQL.
This script is designed to be run by Airflow DAGs.
"""

import os
import polars as pl
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime


def get_db_connection():
    """Get database connection from environment variable."""
    db_url = os.environ.get('WEBAPP_DATABASE_URL')
    if not db_url:
        raise ValueError("WEBAPP_DATABASE_URL environment variable not set")
    return psycopg2.connect(db_url)


def load_regions(data_path: str, batch_size: int = 1000):
    """Load regions from parquet file to PostgreSQL."""
    parquet_path = os.path.join(data_path, 'regions.parquet')

    print(f"Loading regions from {parquet_path}")
    df = pl.read_parquet(parquet_path)

    print(f"Found {len(df)} regions")

    # Convert to records
    records = df.select([
        'region_id',
        'region_id_original',
        'region_name',
        'state',
        'state_name',
        'city',
        'county',
        'metro',
        'GeographyLevel',
        'RegionType',
        'SizeRank',
        'StateCodeFIPS',
        'MunicipalCodeFIPS',
    ]).to_dicts()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Clear existing data
        cursor.execute("TRUNCATE TABLE regions CASCADE")

        # Insert in batches
        insert_sql = """
            INSERT INTO regions (
                region_id, region_id_original, region_name, state, state_name,
                city, county, metro, geography_level, region_type,
                size_rank, state_code_fips, municipal_code_fips
            ) VALUES %s
        """

        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            values = [
                (
                    r['region_id'],
                    r.get('region_id_original'),
                    r['region_name'],
                    r.get('state'),
                    r.get('state_name'),
                    r.get('city'),
                    r.get('county'),
                    r.get('metro'),
                    r['GeographyLevel'],
                    r.get('RegionType'),
                    r.get('SizeRank'),
                    r.get('StateCodeFIPS'),
                    r.get('MunicipalCodeFIPS'),
                )
                for r in batch
            ]
            execute_values(cursor, insert_sql, values)
            print(f"Inserted {min(i + batch_size, len(records))}/{len(records)} regions")

        conn.commit()
        print(f"Successfully loaded {len(records)} regions")

    finally:
        cursor.close()
        conn.close()

    return len(records)


def load_zhvi_state(data_path: str, batch_size: int = 5000):
    """Load state-level ZHVI data from parquet file to PostgreSQL."""
    parquet_path = os.path.join(data_path, 'by_geography', 'zhvi_state.parquet')

    print(f"Loading ZHVI state data from {parquet_path}")
    df = pl.read_parquet(parquet_path)

    print(f"Found {len(df)} ZHVI records")

    # Convert to records
    records = df.select([
        'region_id',
        'date',
        'value',
        'geography_level',
        'home_type',
        'tier',
        'bedrooms',
        'smoothed',
        'seasonally_adjusted',
        'frequency',
    ]).to_dicts()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Clear existing state-level data
        cursor.execute("DELETE FROM zhvi_values WHERE geography_level = 'State'")

        # Insert in batches
        insert_sql = """
            INSERT INTO zhvi_values (
                region_id, date, value, geography_level, home_type,
                tier, bedrooms, smoothed, seasonally_adjusted, frequency
            ) VALUES %s
        """

        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            values = [
                (
                    r['region_id'],
                    r['date'],
                    r.get('value'),
                    r['geography_level'],
                    r['home_type'],
                    r.get('tier'),
                    r.get('bedrooms'),
                    r.get('smoothed', False),
                    r.get('seasonally_adjusted', False),
                    r.get('frequency', 'monthly'),
                )
                for r in batch
            ]
            execute_values(cursor, insert_sql, values)
            print(f"Inserted {min(i + batch_size, len(records))}/{len(records)} ZHVI records")

        conn.commit()
        print(f"Successfully loaded {len(records)} ZHVI state records")

    finally:
        cursor.close()
        conn.close()

    return len(records)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Load Zillow data to PostgreSQL')
    parser.add_argument('--data-path', default='/opt/airflow/zillow_data',
                        help='Path to processed parquet files')
    parser.add_argument('--load-type', choices=['regions', 'zhvi_state', 'all'],
                        default='all', help='Type of data to load')

    args = parser.parse_args()

    if args.load_type in ['regions', 'all']:
        load_regions(args.data_path)

    if args.load_type in ['zhvi_state', 'all']:
        load_zhvi_state(args.data_path)

"""
Airflow DAG to load Zillow data from parquet files to PostgreSQL.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
import sys
import os

# Add scripts directory to path
sys.path.insert(0, '/opt/airflow/scripts')

default_args = {
    'owner': 'housingiq',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'load_zillow_data',
    default_args=default_args,
    description='Load Zillow data from parquet to PostgreSQL',
    schedule_interval=None,  # Manual trigger only for now
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['housingiq', 'etl'],
)


def load_regions_task():
    """Task to load regions data."""
    from load_data import load_regions
    data_path = os.environ.get('ZILLOW_DATA_PATH', '/opt/airflow/zillow_data')
    count = load_regions(data_path)
    return f"Loaded {count} regions"


def load_zhvi_state_task():
    """Task to load state-level ZHVI data."""
    from load_data import load_zhvi_state
    data_path = os.environ.get('ZILLOW_DATA_PATH', '/opt/airflow/zillow_data')
    count = load_zhvi_state(data_path)
    return f"Loaded {count} ZHVI state records"


# Install required Python packages
install_deps = BashOperator(
    task_id='install_dependencies',
    bash_command='pip install polars psycopg2-binary',
    dag=dag,
)

# Load regions
load_regions = PythonOperator(
    task_id='load_regions',
    python_callable=load_regions_task,
    dag=dag,
)

# Load ZHVI state data
load_zhvi_state = PythonOperator(
    task_id='load_zhvi_state',
    python_callable=load_zhvi_state_task,
    dag=dag,
)

# Define task dependencies
install_deps >> load_regions >> load_zhvi_state

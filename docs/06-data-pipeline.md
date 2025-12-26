# Data Pipeline Documentation

## Overview

The data pipeline uses Apache Airflow to orchestrate ETL (Extract, Transform, Load) processes that move Zillow housing data from parquet files into PostgreSQL.

## Pipeline Architecture

```mermaid
flowchart LR
    subgraph Source["Data Source"]
        ZR[Zillow Research]
        CSV[CSV Files]
        PQ[Parquet Files]
    end

    subgraph Pipeline["Airflow Pipeline"]
        DAG[load_zillow_data DAG]
        ETL[ETL Scripts]
    end

    subgraph Target["Target"]
        PG[(PostgreSQL)]
        WEB[Web Application]
    end

    ZR --> CSV
    CSV --> |"ETL (zillow_data_sc)"| PQ
    PQ --> DAG
    DAG --> ETL
    ETL --> PG
    PG --> WEB
```

## Data Flow

```mermaid
sequenceDiagram
    participant Z as Zillow Research
    participant S as Scraper
    participant D as Downloader
    participant E as ETL
    participant A as Airflow
    participant P as PostgreSQL

    Note over Z,S: One-time setup (zillow_data_sc)
    S->>S: Generate manifest.json
    D->>Z: Download CSVs
    Z->>D: Return data
    E->>D: Read CSVs
    E->>E: Transform to parquet

    Note over A,P: Recurring pipeline
    A->>A: Trigger DAG
    A->>E: Run load_regions
    E->>P: INSERT regions
    A->>E: Run load_zhvi_state
    E->>P: INSERT zhvi_values
```

## Airflow Setup

### Docker Compose Configuration

**File:** `data-pipeline/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: airflow
      POSTGRES_PASSWORD: airflow
      POSTGRES_DB: airflow

  airflow-webserver:
    image: apache/airflow:2.8.1-python3.11
    command: webserver
    ports:
      - "8080:8080"
    environment:
      WEBAPP_DATABASE_URL: postgresql://housingiq:housingiq_dev@host.docker.internal:5433/housingiq

  airflow-scheduler:
    image: apache/airflow:2.8.1-python3.11
    command: scheduler
```

### Service Architecture

```mermaid
graph TB
    subgraph Docker["Docker Compose"]
        subgraph Airflow["Airflow Services"]
            WS[Webserver<br/>:8080]
            SC[Scheduler]
            INIT[Init Container]
        end

        APG[(Airflow Postgres)]

        subgraph Volumes["Volumes"]
            DAGS[/dags]
            LOGS[/logs]
            SCRIPTS[/scripts]
            DATA[/zillow_data]
        end
    end

    subgraph External["External"]
        WEBPG[(Webapp Postgres<br/>:5433)]
    end

    WS --> APG
    SC --> APG
    SC --> DAGS
    SC --> SCRIPTS
    SCRIPTS --> DATA
    SCRIPTS --> WEBPG
```

## DAG Definition

**File:** `data-pipeline/dags/load_zillow_data.py`

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator

dag = DAG(
    'load_zillow_data',
    schedule_interval=None,  # Manual trigger
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['housingiq', 'etl'],
)

# Task 1: Install dependencies
install_deps = BashOperator(
    task_id='install_dependencies',
    bash_command='pip install polars psycopg2-binary',
)

# Task 2: Load regions
load_regions = PythonOperator(
    task_id='load_regions',
    python_callable=load_regions_task,
)

# Task 3: Load ZHVI state data
load_zhvi_state = PythonOperator(
    task_id='load_zhvi_state',
    python_callable=load_zhvi_state_task,
)

# Dependencies
install_deps >> load_regions >> load_zhvi_state
```

### DAG Visualization

```mermaid
graph LR
    A[install_dependencies] --> B[load_regions]
    B --> C[load_zhvi_state]

    style A fill:#f9f,stroke:#333
    style B fill:#bbf,stroke:#333
    style C fill:#bbf,stroke:#333
```

## ETL Scripts

**File:** `data-pipeline/scripts/load_data.py`

### load_regions()

Loads geographic region metadata from `regions.parquet`:

```python
def load_regions(data_path: str, batch_size: int = 1000):
    parquet_path = os.path.join(data_path, 'regions.parquet')
    df = pl.read_parquet(parquet_path)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear existing data
    cursor.execute("TRUNCATE TABLE regions CASCADE")

    # Batch insert
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        execute_values(cursor, insert_sql, values)

    conn.commit()
```

### load_zhvi_state()

Loads state-level ZHVI data from `by_geography/zhvi_state.parquet`:

```python
def load_zhvi_state(data_path: str, batch_size: int = 5000):
    parquet_path = os.path.join(data_path, 'by_geography', 'zhvi_state.parquet')
    df = pl.read_parquet(parquet_path)

    # Clear existing state-level data
    cursor.execute("DELETE FROM zhvi_values WHERE geography_level = 'State'")

    # Batch insert
    for i in range(0, len(records), batch_size):
        execute_values(cursor, insert_sql, values)
```

## Data Transformation

```mermaid
flowchart TD
    subgraph Input["Input: Parquet Files"]
        REG[regions.parquet<br/>75K rows]
        ZHVI[zhvi_state.parquet<br/>173K rows]
    end

    subgraph Transform["Transformation"]
        T1[Read with Polars]
        T2[Select columns]
        T3[Convert to dicts]
        T4[Batch processing]
    end

    subgraph Output["Output: PostgreSQL"]
        R[(regions table)]
        Z[(zhvi_values table)]
    end

    REG --> T1 --> T2 --> T3 --> T4 --> R
    ZHVI --> T1
    T4 --> Z
```

## Running the Pipeline

### Start Airflow

```bash
cd data-pipeline

# Set Airflow UID (Linux)
echo "AIRFLOW_UID=$(id -u)" >> .env

# Start services
docker compose up -d

# Wait for initialization (~30 seconds)
docker compose logs -f airflow-init
```

### Access Airflow UI

1. Open http://localhost:8080
2. Login: `admin` / `admin`
3. Find `load_zillow_data` DAG
4. Toggle DAG to "Active"
5. Click "Trigger DAG" button

### Monitor Execution

```mermaid
stateDiagram-v2
    [*] --> Queued
    Queued --> Running
    Running --> Success
    Running --> Failed
    Failed --> Queued: Retry
    Success --> [*]
```

### View Logs

```bash
# All logs
docker compose logs -f

# Specific service
docker compose logs -f airflow-scheduler
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| WEBAPP_DATABASE_URL | Target PostgreSQL | postgresql://housingiq:pass@host:5433/housingiq |
| ZILLOW_DATA_PATH | Path to parquet files | /opt/airflow/zillow_data |
| AIRFLOW_UID | Linux user ID | 50000 |

## File Structure

```
data-pipeline/
├── docker-compose.yml      # Airflow services
├── .env                    # Environment variables
├── requirements.txt        # Python dependencies
├── dags/
│   └── load_zillow_data.py # DAG definition
├── scripts/
│   └── load_data.py        # ETL functions
├── logs/                   # Airflow logs
└── plugins/                # Custom plugins
```

## Scaling Considerations

### Current Setup (LocalExecutor)

- Single machine execution
- Sequential task processing
- Suitable for development

### Production Setup (CeleryExecutor)

```mermaid
graph TB
    subgraph Airflow["Airflow Cluster"]
        WS[Webserver]
        SC[Scheduler]
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker 3]
    end

    subgraph Backend["Backend"]
        PG[(PostgreSQL)]
        RD[(Redis)]
    end

    SC --> RD
    RD --> W1
    RD --> W2
    RD --> W3
    W1 --> PG
    W2 --> PG
    W3 --> PG
```

For full dataset (122M+ rows):
- Use CeleryExecutor with multiple workers
- Partition by geography level
- Use connection pooling
- Consider batch size tuning

## Troubleshooting

| Issue | Solution |
|-------|----------|
| DAG not visible | Check file syntax, restart scheduler |
| Connection refused | Ensure webapp Postgres is running on 5433 |
| Out of memory | Reduce batch_size parameter |
| Slow loading | Increase batch_size, add more workers |

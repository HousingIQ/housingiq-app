# ============================================================================
# HousingIQ Data Platform - Dagster + Polars
# ============================================================================
# Used for both dagster-webserver and dagster-daemon services.
# The command is specified in docker-compose.yml per service.
# ============================================================================

FROM python:3.11-slim AS runtime

# Install system dependencies required by psycopg2, polars, pyarrow
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/dagster/app

# Copy project files and install Python package
COPY pyproject.toml README.md ./
COPY housingiq_dagster/ ./housingiq_dagster/
COPY ingestion/ ./ingestion/
COPY scripts/ ./scripts/

RUN pip install --no-cache-dir .

# Data directories are created at runtime via the volume mount.
# The application's DataDirectoryResource.ensure_dirs() handles this.

# Dagster home - stores run history, event logs, compute logs
ENV DAGSTER_HOME=/opt/dagster/dagster_home
RUN mkdir -p ${DAGSTER_HOME}

# Copy Docker-specific Dagster configuration
COPY dagster-docker.yaml ${DAGSTER_HOME}/dagster.yaml
COPY workspace.yaml ${DAGSTER_HOME}/workspace.yaml

EXPOSE 3001

# ============================================================================
# Test stage - adds tests directory and dev dependencies (pytest, etc.)
# Used by docker-compose test profile services.
# ============================================================================
FROM python:3.11-slim AS test

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/dagster/app

COPY pyproject.toml README.md ./
COPY housingiq_dagster/ ./housingiq_dagster/
COPY ingestion/ ./ingestion/
COPY scripts/ ./scripts/
COPY tests/ ./tests/

RUN pip install --no-cache-dir ".[dev]"

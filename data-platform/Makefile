# HousingIQ Data Platform Makefile

.PHONY: setup dagster dbt-run dbt-test dbt-docs dbt-build gx gx-docs test clean help

help:
	@echo "Data Platform Commands"
	@echo "======================"
	@echo ""
	@echo "Setup:"
	@echo "  make setup     - Install dependencies and dbt packages"
	@echo ""
	@echo "Dagster:"
	@echo "  make dagster   - Start Dagster UI (localhost:3000)"
	@echo ""
	@echo "dbt:"
	@echo "  make dbt-run   - Run dbt models"
	@echo "  make dbt-test  - Run dbt tests"
	@echo "  make dbt-build - Run dbt build (run + test)"
	@echo "  make dbt-docs  - Generate and serve dbt docs"
	@echo ""
	@echo "Data Quality:"
	@echo "  make gx        - Run Great Expectations checkpoint"
	@echo "  make gx-docs   - Generate GX data docs"
	@echo ""
	@echo "Testing:"
	@echo "  make test      - Run all tests"
	@echo "  make lint      - Run linter"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean     - Remove local data files"

# ============================================================================
# Setup
# ============================================================================

setup:
	pip install -e ".[dev]"
	cd dbt && dbt deps
	@echo ""
	@echo "Setup complete! Next steps:"
	@echo "  1. Ensure PostgreSQL is running: cd .. && make up"
	@echo "  2. Start Dagster: make dagster"

# ============================================================================
# Dagster
# ============================================================================

dagster:
	dagster dev -m dagster.definitions

dagster-materialize:
	dagster job execute -m dagster.definitions -j __ASSET_JOB

# ============================================================================
# dbt
# ============================================================================

dbt-run:
	cd dbt && dbt run

dbt-test:
	cd dbt && dbt test

dbt-build:
	cd dbt && dbt build

dbt-docs:
	cd dbt && dbt docs generate && dbt docs serve --port 8080

dbt-clean:
	cd dbt && dbt clean

# ============================================================================
# Great Expectations
# ============================================================================

gx:
	great_expectations checkpoint run zillow_checkpoint

gx-docs:
	great_expectations docs build --site-name local_site

# ============================================================================
# Testing & Linting
# ============================================================================

test:
	pytest tests/ -v
	cd dbt && dbt test

lint:
	ruff check .
	ruff format --check .

format:
	ruff format .
	ruff check --fix .

typecheck:
	mypy dagster/ ingestion/

# ============================================================================
# Cleanup
# ============================================================================

clean:
	rm -rf data/raw/*
	rm -rf data/staging/*
	@echo "Local data cleaned"

clean-all: clean dbt-clean
	@echo "All generated files cleaned"

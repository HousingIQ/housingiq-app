.PHONY: help setup install dagster dbt-run dbt-test dbt-docs gx test lint clean

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Setup
# =============================================================================

setup: install dbt-deps  ## Full setup: install dependencies and dbt packages

install:  ## Install Python dependencies
	pip install -e ".[dev]"

dbt-deps:  ## Install dbt packages
	cd dbt && dbt deps

# =============================================================================
# Dagster
# =============================================================================

dagster:  ## Start Dagster webserver
	dagster dev -m dagster.definitions

dagster-materialize:  ## Materialize all assets
	dagster asset materialize --select "*" -m dagster.definitions

# =============================================================================
# dbt
# =============================================================================

dbt-run:  ## Run dbt models
	cd dbt && dbt run

dbt-run-staging:  ## Run staging models only
	cd dbt && dbt run --select staging.*

dbt-run-marts:  ## Run mart models only
	cd dbt && dbt run --select marts.*

dbt-run-app:  ## Run app models only
	cd dbt && dbt run --select app.*

dbt-test:  ## Run dbt tests
	cd dbt && dbt test

dbt-docs:  ## Generate and serve dbt docs
	cd dbt && dbt docs generate && dbt docs serve

dbt-compile:  ## Compile dbt project
	cd dbt && dbt compile

dbt-clean:  ## Clean dbt artifacts
	cd dbt && dbt clean

# =============================================================================
# Great Expectations
# =============================================================================

gx:  ## Run Great Expectations validation
	great_expectations checkpoint run zillow_checkpoint

gx-docs:  ## Build and open GX data docs
	great_expectations docs build

# =============================================================================
# Ingestion
# =============================================================================

scrape:  ## Scrape Zillow URLs and save manifest
	python -c "from ingestion.sources.zillow import ZillowScraper; s=ZillowScraper(); s.save_manifest(s.generate_all_urls())"

download:  ## Download Zillow data (default categories)
	python -c "from ingestion.sources.zillow import download_zillow_data; download_zillow_data()"

download-all:  ## Download all Zillow data (all categories)
	python -c "from ingestion.sources.zillow import download_zillow_data; download_zillow_data(categories=None)"

transform:  ## Transform downloaded data
	python -c "from ingestion.sources.zillow import ZillowSource; ZillowSource().run_full_pipeline()"

# =============================================================================
# Testing
# =============================================================================

test:  ## Run pytest
	pytest tests/ -v

test-cov:  ## Run pytest with coverage
	pytest tests/ -v --cov=ingestion --cov=dagster --cov-report=html

# =============================================================================
# Code Quality
# =============================================================================

lint:  ## Run linter (ruff)
	ruff check .

lint-fix:  ## Fix linting issues
	ruff check --fix .

format:  ## Format code
	ruff format .

typecheck:  ## Run type checker
	mypy ingestion dagster

# =============================================================================
# Cleanup
# =============================================================================

clean:  ## Clean all generated files
	rm -rf data/
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .ruff_cache/
	find . -type d -name "__pycache__" -exec rm -rf {} +
	cd dbt && dbt clean

clean-data:  ## Clean downloaded data only
	rm -rf data/

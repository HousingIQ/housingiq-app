UV_RUN := uv run

.PHONY: help setup install dagster gx test lint clean

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Setup
# =============================================================================

setup: install  ## Full setup: install dependencies

install:  ## Install Python dependencies
	uv sync --extra dev

# =============================================================================
# Dagster
# =============================================================================

dagster:  ## Start Dagster webserver
	DAGSTER_HOME=$(PWD) $(UV_RUN) dagster dev -h 0.0.0.0 -m housingiq_dagster.definitions

dagster-materialize:  ## Materialize all assets
	DAGSTER_HOME=$(PWD) $(UV_RUN) dagster asset materialize --select "*" -m housingiq_dagster.definitions

# =============================================================================
# Great Expectations
# =============================================================================

gx:  ## Run Great Expectations validation
	$(UV_RUN) great_expectations checkpoint run zillow_checkpoint

gx-docs:  ## Build and open GX data docs
	$(UV_RUN) great_expectations docs build

# =============================================================================
# Ingestion
# =============================================================================

scrape:  ## Scrape Zillow URLs and save manifest
	$(UV_RUN) python -c "from ingestion.sources.zillow import ZillowScraper; s=ZillowScraper(); s.save_manifest(s.generate_all_urls())"

check-freshness:  ## Check which files need updating (dry run)
	$(UV_RUN) python scripts/check_freshness.py

check-freshness-7d:  ## Check freshness with 7-day threshold
	$(UV_RUN) python scripts/check_freshness.py --max-age 7

download:  ## Download Zillow data (re-download if >30 days old)
	$(UV_RUN) python -c "from ingestion.sources.zillow import download_zillow_data; download_zillow_data(max_age_days=30)"

download-force:  ## Force re-download all Zillow data
	$(UV_RUN) python -c "from ingestion.sources.zillow import download_zillow_data; download_zillow_data(max_age_days=0)"

download-all:  ## Download all categories (not just defaults)
	$(UV_RUN) python -c "from ingestion.sources.zillow import download_zillow_data; download_zillow_data(categories=None, max_age_days=30)"

transform:  ## Transform downloaded data
	$(UV_RUN) python -c "from ingestion.sources.zillow import ZillowSource; ZillowSource().run_full_pipeline()"

# =============================================================================
# Testing
# =============================================================================

test:  ## Run pytest
	$(UV_RUN) pytest tests/ -v

test-cov:  ## Run pytest with coverage
	$(UV_RUN) pytest tests/ -v --cov=ingestion --cov=housingiq_dagster --cov-report=html

# =============================================================================
# Code Quality
# =============================================================================

lint:  ## Run linter (ruff)
	$(UV_RUN) ruff check .

lint-fix:  ## Fix linting issues
	$(UV_RUN) ruff check --fix .

format:  ## Format code
	$(UV_RUN) ruff format .

typecheck:  ## Run type checker
	$(UV_RUN) mypy ingestion housingiq_dagster

# =============================================================================
# Cleanup
# =============================================================================

clean:  ## Clean all generated files
	rm -rf data/raw/ data/staging/ data/mart/
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .ruff_cache/
	rm -rf .dagster/
	find . -type d -name "__pycache__" -exec rm -rf {} +

clean-data:  ## Clean all data layers
	rm -rf data/raw/ data/staging/ data/mart/

clean-raw:  ## Clean raw downloaded data only
	rm -rf data/raw/

clean-staging:  ## Clean staging (intermediate) data only
	rm -rf data/staging/

clean-mart:  ## Clean mart (final) data only
	rm -rf data/mart/

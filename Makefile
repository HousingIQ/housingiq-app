# HousingIQ Root Makefile
# Manages shared infrastructure and orchestrates sub-projects

.PHONY: up down logs psql clean help

# Default target
help:
	@echo "HousingIQ Development Commands"
	@echo "=============================="
	@echo ""
	@echo "Infrastructure:"
	@echo "  make up       - Start PostgreSQL and pgweb"
	@echo "  make down     - Stop all services"
	@echo "  make logs     - View service logs"
	@echo "  make psql     - Connect to PostgreSQL"
	@echo "  make clean    - Remove volumes and data"
	@echo ""
	@echo "Sub-projects:"
	@echo "  make webapp   - Start webapp (Next.js)"
	@echo "  make dagster  - Start Dagster UI"
	@echo "  make dbt      - Run dbt build"
	@echo ""

# ============================================================================
# Infrastructure
# ============================================================================

up:
	docker compose up -d
	@echo ""
	@echo "Services running:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  pgweb:      http://localhost:8081"
	@echo ""
	@echo "To connect: make psql"

down:
	docker compose down

logs:
	docker compose logs -f

psql:
	docker compose exec postgres psql -U housingiq -d housingiq

clean:
	docker compose down -v
	@echo "Volumes removed"

# ============================================================================
# Sub-projects
# ============================================================================

webapp:
	cd webapp && npm run dev

dagster:
	cd data-platform && dagster dev

dbt:
	cd data-platform/dbt && dbt build

dbt-docs:
	cd data-platform/dbt && dbt docs generate && dbt docs serve --port 8080

# ============================================================================
# Full Pipeline
# ============================================================================

run-pipeline:
	cd data-platform && dagster job execute -m dagster.definitions -j all_assets

# ============================================================================
# Setup (first time)
# ============================================================================

setup: up
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo "Infrastructure ready!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. cd data-platform && pip install -e '.[dev]'"
	@echo "  2. cd data-platform/dbt && dbt deps"
	@echo "  3. make dagster"


# HousingIQ Root Makefile
# Manages shared infrastructure and orchestrates sub-projects

# Load .env file if it exists
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

DATA_PLATFORM_DIR := data-platform
DATA_PLATFORM_DAGSTER_HOME := $(CURDIR)/$(DATA_PLATFORM_DIR)

.PHONY: up down logs psql clean help setup dev webapp dagster \
        docker-build docker-up docker-down docker-logs docker-init docker-restart \
        test-data test-data-integration test-data-all \
        sync-to-neon sync-to-neon-dry

# Default target
help:
	@echo "HousingIQ Development Commands"
	@echo "=============================="
	@echo ""
	@echo "Docker (Full Stack):"
	@echo "  make docker-build   - Build all Docker images"
	@echo "  make docker-up      - Start all services via Docker"
	@echo "  make docker-init    - Initialize DB schema + seed test user"
	@echo "  make docker-down    - Stop all Docker services"
	@echo "  make docker-logs    - Follow logs from all services"
	@echo "  make docker-restart - Rebuild and restart all services"
	@echo "  make docker-clean   - Stop services and remove volumes"
	@echo ""
	@echo "Quick Start (Docker):"
	@echo "  make docker-build && make docker-up && make docker-init"
	@echo ""
	@echo "Quick Start (Local Dev):"
	@echo "  make setup          - First-time setup (install deps, push schema)"
	@echo "  make dev            - Start all services for local development"
	@echo ""
	@echo "Local Infrastructure:"
	@echo "  make up             - Start PostgreSQL and pgweb (Docker)"
	@echo "  make down           - Stop PostgreSQL and pgweb"
	@echo "  make logs           - View infrastructure logs"
	@echo "  make psql           - Connect to PostgreSQL CLI"
	@echo "  make clean          - Remove volumes and data"
	@echo ""
	@echo "Local Individual Services:"
	@echo "  make webapp         - Start webapp only (Next.js on port 3004)"
	@echo "  make dagster        - Start Dagster only (on port 3003)"
	@echo ""
	@echo "Data Pipeline:"
	@echo "  make materialize    - Materialize all Dagster assets"
	@echo ""
	@echo "Testing (Docker):"
	@echo "  make test-data              - Run data-platform unit tests in Docker"
	@echo "  make test-data-integration  - Run data-platform DB integration tests"
	@echo "  make test-data-all          - Run all data-platform tests"
	@echo ""
	@echo "Production Sync:"
	@echo "  make sync-to-neon     - Sync app schema to Neon (requires NEON_DATABASE_URL)"
	@echo "  make sync-to-neon-dry - Dry run: show what would be synced"
	@echo ""

# ============================================================================
# Docker - Full Stack
# ============================================================================

docker-build:  ## Build all Docker images
	docker compose build

docker-up:  ## Start all services via Docker Compose
	docker compose up -d
	@echo ""
	@echo "=========================================="
	@echo "HousingIQ is starting..."
	@echo "=========================================="
	@echo ""
	@echo "Services:"
	@echo "  PostgreSQL:  localhost:5432"
	@echo "  pgweb:       http://localhost:8081"
	@echo "  Webapp:      http://localhost:3004"
	@echo "  Dagster UI:  http://localhost:3003"
	@echo ""
	@echo "If this is your first time, run:  make docker-init"
	@echo ""

docker-init:  ## Initialize DB schema + seed test user (run once after first docker-up)
	docker compose --profile init run --rm webapp-init
	@echo ""
	@echo "=========================================="
	@echo "Database initialized!"
	@echo "=========================================="
	@echo ""
	@echo "Test user credentials:"
	@echo "  Email:    test@housingiq.com"
	@echo "  Password: TestPassword123!"
	@echo ""

docker-down:  ## Stop all Docker services
	docker compose --profile init down

docker-logs:  ## Follow logs from all Docker services
	docker compose logs -f

docker-restart: docker-down docker-build docker-up  ## Rebuild and restart all services

docker-clean:  ## Stop services and remove all volumes (fresh start)
	docker compose --profile init down -v
	@echo "All volumes removed. Run 'make docker-build && make docker-up && make docker-init' for a fresh start."

# ============================================================================
# Local Quick Start
# ============================================================================

setup: up  ## First-time setup (local dev)
	@echo "=========================================="
	@echo "Setting up HousingIQ Development Environment"
	@echo "=========================================="
	@echo ""
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo ""
	@echo "[1/4] Installing data platform dependencies..."
	uv sync --project $(DATA_PLATFORM_DIR) --extra dev
	@echo ""
	@echo "[2/4] Installing webapp dependencies..."
	cd webapp && npm install
	@echo ""
	@echo "[3/4] Pushing database schema..."
	cd webapp && npm run db:push
	@echo ""
	@echo "[4/4] Seeding test user..."
	cd webapp && npm run db:seed-test-user
	@echo ""
	@echo "=========================================="
	@echo "Setup Complete!"
	@echo "=========================================="
	@echo ""
	@echo "Test user credentials:"
	@echo "  Email:    test@housingiq.com"
	@echo "  Password: TestPassword123!"
	@echo ""
	@echo "To start development:"
	@echo "  make dev"
	@echo ""
	@echo "Or start services individually:"
	@echo "  make webapp   - Start Next.js (port 3004)"
	@echo "  make dagster  - Start Dagster (port 3003)"
	@echo ""

dev: up  ## Start all services for local development
	@echo "Starting HousingIQ development environment..."
	@echo ""
	@echo "Services:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  pgweb:      http://localhost:8081"
	@echo "  Webapp:     http://localhost:3004"
	@echo "  Dagster:    http://localhost:3003"
	@echo ""
	@echo "Data directory: data-platform/data/"
	@echo "  raw/      - Downloaded Zillow CSV files"
	@echo "  staging/  - Normalized Parquet files"
	@echo "  mart/     - Final transformed Parquet files"
	@echo ""
	@echo "Starting webapp and Dagster in parallel..."
	@echo "(Press Ctrl+C to stop all services)"
	@echo ""
	@trap 'kill 0' SIGINT; \
		(cd webapp && AUTH_URL=http://localhost:3004 npm run dev -- -p 3004) & \
		(cd $(DATA_PLATFORM_DIR) && DAGSTER_HOME=$(DATA_PLATFORM_DAGSTER_HOME) uv run dagster dev -h 0.0.0.0 -m housingiq_dagster.definitions -p 3003) & \
		wait

# ============================================================================
# Local Infrastructure (DB only)
# ============================================================================

up:  ## Start PostgreSQL + pgweb containers only (for local dev)
	@# Guard: fail if full-stack Docker is already running on ports 3004/3003
	@if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'housingiq-dagster-webserver'; then \
		echo ""; \
		echo "ERROR: Full-stack Docker is running (dagster-webserver container detected)."; \
		echo "Run 'make docker-down' first, or use 'make docker-up' for full Docker mode."; \
		echo ""; \
		exit 1; \
	fi
	docker compose up -d postgres pgweb
	@echo ""
	@echo "Services running:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  pgweb:      http://localhost:8081"
	@echo ""

down:  ## Stop local infrastructure (PostgreSQL + pgweb only)
	docker compose stop postgres pgweb
	docker compose rm -f postgres pgweb
	@echo "Local infrastructure stopped."

logs:  ## View PostgreSQL + pgweb logs
	docker compose logs -f postgres pgweb

psql:  ## Connect to PostgreSQL CLI
	docker compose exec postgres psql -U housingiq -d housingiq

clean:  ## Remove PostgreSQL volume and data (fresh start)
	docker compose stop postgres pgweb
	docker compose rm -f postgres pgweb
	docker volume rm -f housingiq-app_pgdata
	@echo "PostgreSQL volume removed."

# ============================================================================
# Individual Services (local dev)
# ============================================================================

webapp: up  ## Start webapp (Next.js)
	cd webapp && AUTH_URL=http://localhost:3004 npm run dev -- -p 3004

dagster: up  ## Start Dagster UI
	cd $(DATA_PLATFORM_DIR) && DAGSTER_HOME=$(DATA_PLATFORM_DAGSTER_HOME) uv run dagster dev -h 0.0.0.0 -m housingiq_dagster.definitions -p 3003

# ============================================================================
# Database Operations
# ============================================================================

db-push:  ## Push Drizzle schema to database
	cd webapp && npm run db:push

db-seed:  ## Seed test user
	cd webapp && npm run db:seed-test-user

db-studio:  ## Open Drizzle Studio
	cd webapp && npm run db:studio

# ============================================================================
# Data Pipeline
# ============================================================================

materialize:  ## Materialize all Dagster assets
	cd $(DATA_PLATFORM_DIR) && DAGSTER_HOME=$(DATA_PLATFORM_DAGSTER_HOME) uv run dagster asset materialize --select "*" -m housingiq_dagster.definitions

# ============================================================================
# Testing (Docker)
# ============================================================================

test-data:  ## Run data-platform unit + asset tests in Docker (no DB required)
	docker compose --profile test run --rm data-platform-test

test-data-integration:  ## Run data-platform integration tests (requires PostgreSQL)
	docker compose --profile test run --rm data-platform-test-integration

test-data-all: test-data test-data-integration  ## Run all data-platform tests

# ============================================================================
# Production Sync
# ============================================================================

sync-to-neon:  ## Sync app schema from local PostgreSQL to Neon (production)
	@if [ -z "$$NEON_DATABASE_URL" ]; then \
		echo "Error: NEON_DATABASE_URL environment variable not set"; \
		echo "Usage: NEON_DATABASE_URL='postgresql://...' make sync-to-neon"; \
		exit 1; \
	fi
	cd $(DATA_PLATFORM_DIR) && uv run python scripts/sync_to_neon.py

sync-to-neon-dry:  ## Dry run: show what would be synced to Neon
	@if [ -z "$$NEON_DATABASE_URL" ]; then \
		echo "Error: NEON_DATABASE_URL environment variable not set"; \
		echo "Usage: NEON_DATABASE_URL='postgresql://...' make sync-to-neon-dry"; \
		exit 1; \
	fi
	cd $(DATA_PLATFORM_DIR) && uv run python scripts/sync_to_neon.py --dry-run

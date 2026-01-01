
# HousingIQ Root Makefile
# Manages shared infrastructure and orchestrates sub-projects

.PHONY: up down logs psql clean help setup dev webapp dagster

# Default target
help:
	@echo "HousingIQ Development Commands"
	@echo "=============================="
	@echo ""
	@echo "Quick Start:"
	@echo "  make setup     - First-time setup (install all dependencies)"
	@echo "  make dev       - Start all services for development"
	@echo ""
	@echo "Infrastructure:"
	@echo "  make up        - Start PostgreSQL and pgweb"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - View service logs"
	@echo "  make psql      - Connect to PostgreSQL"
	@echo "  make clean     - Remove volumes and data"
	@echo ""
	@echo "Individual Services:"
	@echo "  make webapp    - Start webapp only (Next.js on port 3000)"
	@echo "  make dagster   - Start Dagster only (on port 3001)"
	@echo ""

# ============================================================================
# Quick Start
# ============================================================================

setup: up  ## First-time setup
	@echo "=========================================="
	@echo "Setting up HousingIQ Development Environment"
	@echo "=========================================="
	@echo ""
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo ""
	@echo "[1/4] Installing data platform dependencies..."
	cd data-platform && pip install -e ".[dev]"
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
	@echo "  make webapp   - Start Next.js (port 3000)"
	@echo "  make dagster  - Start Dagster (port 3001)"
	@echo ""

dev: up  ## Start all services for development
	@echo "Starting HousingIQ development environment..."
	@echo ""
	@echo "Services:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  pgweb:      http://localhost:8081"
	@echo "  Webapp:     http://localhost:3000"
	@echo "  Dagster:    http://localhost:3001"
	@echo ""
	@echo "Starting webapp and Dagster in parallel..."
	@echo "(Press Ctrl+C to stop all services)"
	@echo ""
	@trap 'kill 0' SIGINT; \
		(cd webapp && npm run dev) & \
		(cd data-platform && DAGSTER_HOME=$(PWD)/data-platform dagster dev -m housingiq_dagster.definitions -p 3001) & \
		wait

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
# Individual Services
# ============================================================================

webapp: up  ## Start webapp (Next.js)
	cd webapp && npm run dev

dagster: up  ## Start Dagster UI
	cd data-platform && DAGSTER_HOME=$(PWD)/data-platform dagster dev -m housingiq_dagster.definitions -p 3001

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
	cd data-platform && DAGSTER_HOME=$(PWD)/data-platform dagster asset materialize --select "*" -m housingiq_dagster.definitions

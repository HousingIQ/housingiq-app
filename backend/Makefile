.PHONY: help install sync-requirements update-deps dev test lint clean

help:
	@echo "Available commands:"
	@echo "  make install          - Create venv and install dependencies with uv"
	@echo "  make sync-requirements - Sync requirements.txt from pyproject.toml"
	@echo "  make update-deps      - Update all dependencies to latest versions"
	@echo "  make dev              - Run development server with auto-reload"
	@echo "  make test             - Run tests with pytest"
	@echo "  make lint             - Run ruff linter"
	@echo "  make clean            - Remove virtual environment and cache"

install:
	uv venv
	uv pip install --python .venv/bin/python -r requirements.txt
	uv pip install --python .venv/bin/python pytest pytest-asyncio httpx ruff

sync-requirements:
	uv pip compile pyproject.toml -o requirements.txt

update-deps:
	uv pip install --python .venv/bin/python -r requirements.txt --upgrade

dev:
	.venv/bin/uvicorn app.main:app --reload --port 8000

test:
	.venv/bin/pytest -v

lint:
	.venv/bin/ruff check app tests
	.venv/bin/ruff format --check app tests

lint-fix:
	.venv/bin/ruff check --fix app tests
	.venv/bin/ruff format app tests

clean:
	rm -rf .venv __pycache__ .pytest_cache .ruff_cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

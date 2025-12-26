.PHONY: help install sync-requirements update-deps dev clean test

help:
	@echo "Available commands:"
	@echo "  make install          - Create venv and install dependencies with uv"
	@echo "  make sync-requirements - Sync requirements.txt from pyproject.toml"
	@echo "  make update-deps      - Update all dependencies to latest versions"
	@echo "  make dev              - Run development server with auto-reload"
	@echo "  make test             - Run tests with pytest"
	@echo "  make clean            - Remove virtual environment"

install:
	uv venv
	uv pip install --python .venv/bin/python -r requirements.txt

sync-requirements:
	uv pip compile pyproject.toml -o requirements.txt

update-deps:
	uv pip install --python .venv/bin/python -r requirements.txt --upgrade

dev:
	.venv/bin/uvicorn server:app --reload --port 8000

test:
	.venv/bin/pytest -v

clean:
	rm -rf .venv __pycache__

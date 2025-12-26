# UV Setup Guide for FastAPI

This project uses [uv](https://github.com/astral-sh/uv) for fast Python package and environment management, while maintaining `requirements.txt` for deployment compatibility (e.g., Vercel).

## Installation

Install uv if you haven't already:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Or on macOS/Linux with Homebrew:
```bash
brew install uv
```

## Quick Start

### 1. Create and activate a virtual environment
```bash
# Create venv using uv
uv venv

# Activate the venv
source .venv/bin/activate  # On Linux/macOS
# or
.venv\Scripts\activate     # On Windows
```

### 2. Install dependencies
```bash
# Install dependencies using uv
# This explicitly uses .venv to avoid conda conflicts
uv pip install --python .venv/bin/python -r requirements.txt

# Or use the Makefile (recommended)
make install
```

### 3. Run the development server
```bash
uvicorn main:app --reload
```

## Common Commands

### Add a new dependency
```bash
# Add to pyproject.toml dependencies manually, then:
uv pip install <package-name>

# Or install and then update pyproject.toml:
uv pip install <package-name>
# Then manually add to pyproject.toml dependencies list
```

### Sync requirements.txt with pyproject.toml
After updating dependencies in `pyproject.toml`, regenerate `requirements.txt`:
```bash
uv pip compile pyproject.toml -o requirements.txt
```

### Update all dependencies
```bash
uv pip install --upgrade -r requirements.txt
```

### Run the app
```bash
# Development mode with auto-reload
uv run uvicorn main:app --reload --port 8000

# Production mode
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

## Workflow

1. **Add dependencies**: Edit `pyproject.toml` to add/update dependencies
2. **Install**: Run `uv pip sync pyproject.toml`
3. **Generate requirements.txt**: Run `uv pip compile pyproject.toml -o requirements.txt` 
4. **Commit both files**: Keep `pyproject.toml` and `requirements.txt` in sync

## Why Both Files?

- **pyproject.toml**: Source of truth for dependencies, used with `uv` for local development
- **requirements.txt**: Required for deployment platforms like Vercel that expect this format

## Notes

- `uv` is significantly faster than pip (~10-100x)
- The virtual environment is created in `.venv/` (already gitignored)
- Always commit both `pyproject.toml` and `requirements.txt` together

### Conda Environment Compatibility

This setup works seamlessly even if you have a conda environment activated (like `conda activate bird`). The Makefile and scripts explicitly use `.venv/bin/python` and `.venv/bin/pip` to ensure the `.venv` is used instead of the conda environment. You don't need to deactivate your conda environment to work on this project!

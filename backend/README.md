# HousingIQ Backend

FastAPI backend for the HousingIQ analytics platform, deployed on Vercel Functions.

## Local Development with uv

### Prerequisites

Install [uv](https://github.com/astral-sh/uv) for fast Python package management:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# or
brew install uv
```

### Quick Start

```bash
# Create virtual environment and install dependencies
make install

# Activate the virtual environment
source .venv/bin/activate

# Run development server
make dev
```

The API will be available at `http://localhost:8000`.

### Available Commands

```bash
make help              # Show all available commands
make install           # Create venv and install dependencies
make dev               # Run dev server with auto-reload
make sync-requirements # Update requirements.txt from pyproject.toml
make update-deps       # Update all dependencies
make test              # Run tests
make clean             # Remove virtual environment
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info and available endpoints |
| `GET /api/health` | Health check |
| `GET /api/metrics` | Housing metrics data |
| `GET /api/macro` | Macroeconomic indicators |
| `GET /api/forecasts` | Price forecasts |
| `GET /api/dashboard` | Dashboard summary |
| `GET /api/markets/{region}` | Market data by region |
| `GET /docs` | Interactive API documentation (Swagger UI) |

## Deployment

This backend is configured for [Vercel Functions](https://vercel.com/docs/functions).

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Project Structure

```
backend/
├── server.py          # FastAPI application
├── pyproject.toml     # Project configuration & dependencies
├── requirements.txt   # Dependencies for Vercel
├── vercel.json        # Vercel configuration
├── Makefile           # Development commands
└── public/            # Static assets
    └── favicon.ico
```

### Configuration

- **pyproject.toml**: Contains `[project.scripts]` that tells Vercel where to find the FastAPI app
- **vercel.json**: Excludes test files and dev artifacts from the bundle

## Technology Stack

- **FastAPI** - Modern, high-performance web framework
- **Pydantic** - Data validation using Python type hints
- **uvicorn** - ASGI server for local development
- **uv** - Fast Python package manager

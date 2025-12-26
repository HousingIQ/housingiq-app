# HousingIQ Backend

FastAPI backend for the HousingIQ analytics platform, deployed on Vercel Functions.

## Project Structure

```
backend/
├── main.py                 # Entry point for Vercel
├── app/
│   ├── __init__.py
│   ├── main.py             # FastAPI app initialization
│   ├── config.py           # Settings (env vars)
│   ├── api/
│   │   ├── deps.py         # Dependency injection
│   │   └── v1/
│   │       ├── router.py   # v1 API router
│   │       └── endpoints/
│   │           ├── health.py
│   │           ├── metrics.py
│   │           ├── dashboard.py
│   │           └── markets.py
│   ├── schemas/            # Pydantic models
│   │   ├── metrics.py
│   │   └── dashboard.py
│   ├── services/           # Business logic
│   │   └── mock_data.py
│   ├── models/             # SQLAlchemy models (future)
│   └── db/                 # Database config (future)
├── tests/
├── pyproject.toml
├── requirements.txt
├── vercel.json
└── Makefile
```

## Local Development

### Prerequisites

Install [uv](https://github.com/astral-sh/uv):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Quick Start

```bash
# Install dependencies
make install

# Activate virtual environment
source .venv/bin/activate

# Run development server
make dev
```

The API will be available at `http://localhost:8000`.

### Available Commands

```bash
make help              # Show all commands
make install           # Create venv and install deps
make dev               # Run dev server with auto-reload
make test              # Run tests
make lint              # Run linter
make lint-fix          # Fix linting issues
make sync-requirements # Update requirements.txt
make clean             # Clean up
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info |
| `GET /api/health` | Health check |
| `GET /api/metrics` | Housing metrics |
| `GET /api/macro` | Macro indicators |
| `GET /api/forecasts` | Price forecasts |
| `GET /api/dashboard` | Dashboard summary |
| `GET /api/markets/{region}` | Region data |
| `GET /docs` | Swagger UI |

## Environment Variables

Create `.env` file:

```env
# App settings
DEBUG=false
ENVIRONMENT=development

# CORS (comma-separated)
CORS_ORIGINS=["http://localhost:3000"]

# Database (future)
DATABASE_URL=
```

## Adding New Features

### New API Endpoint

1. Create endpoint in `app/api/v1/endpoints/`
2. Add schemas in `app/schemas/`
3. Add business logic in `app/services/`
4. Register router in `app/api/v1/router.py`

### Database Integration (Future)

1. Add SQLAlchemy models in `app/models/`
2. Configure database in `app/db/`
3. Set up Alembic for migrations
4. Update services to use database

## Deployment

### Vercel

```bash
vercel
```

The app is configured for automatic deployment via `vercel.json`.

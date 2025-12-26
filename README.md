# HousingIQ App

Monorepo containing the HousingIQ web application.

## Structure

```
housingiq-app/
├── backend/     # FastAPI backend (Vercel Functions)
├── frontend/    # Next.js frontend (Vercel)
└── README.md
```

## Quick Start

### Backend

```bash
cd backend
make install   # Install dependencies with uv
make dev       # Run at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install    # Install dependencies
npm run dev    # Run at http://localhost:3000
```

## Deployment

Both projects are deployed to Vercel as separate projects:

- **Backend**: FastAPI on Vercel Functions
- **Frontend**: Next.js on Vercel

See individual README files in each folder for deployment details.

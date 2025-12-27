# Setup Guide

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Python 3.11+ (with Conda recommended)
- Google Cloud account (for OAuth)
- Git

## Quick Start

```mermaid
flowchart LR
    A[Clone Repo] --> B[Start Postgres]
    B --> C[Configure Env]
    C --> D[Push Schema]
    D --> E[Run Dev Server]
    E --> F[Open Browser]
```

## Step-by-Step Setup

### 1. Clone and Navigate

```bash
git clone <your-repo-url>
cd housingiq
```

### 2. Start PostgreSQL

```bash
cd housingiq-app
make up
```

This starts:
- **PostgreSQL** on port `5432`
- **pgweb** (database UI) on `http://localhost:8081`

Verify it's running:
```bash
docker compose ps
# Should show: housingiq-db and housingiq-pgweb running
```

### 3. Set Up the Webapp

```bash
cd webapp
npm install
```

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5432/housingiq

# NextAuth.js
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 5. Set Up Google OAuth

```mermaid
flowchart TD
    A[Google Cloud Console] --> B[Create/Select Project]
    B --> C[APIs & Services]
    C --> D[Credentials]
    D --> E[Create OAuth Client ID]
    E --> F[Configure URIs]
    F --> G[Copy to .env.local]
```

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "HousingIQ"
3. Navigate to **APIs & Services > OAuth consent screen**
   - User Type: External
   - App name: HousingIQ
   - Support email: your email
   - Save and continue through scopes
4. Navigate to **Credentials > Create Credentials > OAuth client ID**
   - Application type: Web application
   - Name: HousingIQ Local
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env.local`

### 6. Push Database Schema

```bash
npm run db:push
```

Expected output:
```
[✓] Changes applied
```

### 7. Start Development Server

```bash
npm run dev
```

### 8. Open Application

Visit http://localhost:3000

## Setting Up the Data Platform

### 1. Create Conda Environment

```bash
conda create -n housingiq python=3.11 -y
conda activate housingiq
```

### 2. Install Data Platform

```bash
# From housingiq-app root
cd data-platform
pip install -e ".[dev]"
```

### 3. Install dbt Packages

```bash
cd dbt
dbt deps
cd ..
```

### 4. Start Dagster UI

```bash
make dagster
```

Visit http://localhost:3000 (Dagster UI)

> **Note**: Stop the webapp first if it's running on port 3000, or run Dagster on a different port.

### 5. Run the Data Pipeline

**Option A: Using Dagster UI**
1. Open http://localhost:3000
2. Navigate to Assets
3. Click "Materialize all"

**Option B: Using Command Line**
```bash
make download      # Download Zillow data
make dbt-run       # Run dbt transformations
```

## Verification Checklist

### Webapp
- [ ] Docker containers running (`docker compose ps`)
- [ ] Database accessible (`npm run db:studio`)
- [ ] Environment variables set (`.env.local`)
- [ ] Google OAuth configured
- [ ] Dev server running (`npm run dev`)
- [ ] Landing page loads
- [ ] Google sign-in works
- [ ] Dashboard accessible after login

### Data Platform
- [ ] Conda environment activated
- [ ] Python packages installed
- [ ] dbt packages installed
- [ ] Dagster UI loads
- [ ] Assets visible in Dagster

## Common Issues

### Port 5432 Already in Use

```bash
# Find what's using the port
lsof -i :5432

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead

# Update DATABASE_URL accordingly
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5433/housingiq
```

### Database Connection Error

```bash
# Check if container is running
docker compose ps

# View logs
docker compose logs postgres

# Restart container
docker compose down && docker compose up -d
```

### Google OAuth Error

Verify:
1. Redirect URI matches exactly: `http://localhost:3000/api/auth/callback/google`
2. Client ID and Secret are copied correctly (no extra spaces)
3. OAuth consent screen is configured

### dbt Connection Error

```bash
# Test dbt connection
cd data-platform/dbt
dbt debug

# Check profiles.yml has correct settings
# Defaults should work with docker-compose setup
```

## Database Management

### View Database (Drizzle Studio)

```bash
npm run db:studio
```

Opens web UI at https://local.drizzle.studio

### View Database (pgweb)

Visit http://localhost:8081

### Reset Database

```bash
cd housingiq-app
docker compose down -v  # Remove volumes
docker compose up -d    # Fresh start
cd webapp
npm run db:push         # Push schema
```

## Development Workflow

```mermaid
flowchart TD
    subgraph Setup["Initial Setup (once)"]
        S1[docker compose up -d]
        S2[npm install]
        S3[Configure .env.local]
        S4[npm run db:push]
        S5[conda create -n housingiq]
        S6[pip install data-platform]
    end

    subgraph Daily["Daily Development"]
        D1[docker compose up -d]
        D2[npm run dev]
        D3[Edit code]
        D4[View in browser]
        D5[Commit changes]
    end

    S1 --> S2 --> S3 --> S4 --> S5 --> S6
    S6 --> D1
    D1 --> D2 --> D3 --> D4 --> D3
    D4 --> D5
```

## Available Commands

### From `housingiq-app/`

```bash
make help          # Show all commands
make up            # Start PostgreSQL + pgweb
make down          # Stop services
make psql          # Connect to PostgreSQL
make webapp        # Start Next.js dev server
make dagster       # Start Dagster UI
make dbt           # Run dbt build
```

### From `data-platform/`

```bash
make help          # Show all commands
make setup         # Install dependencies + dbt packages
make dagster       # Start Dagster UI
make download      # Download Zillow data
make dbt-run       # Run all dbt models
make dbt-test      # Run dbt tests
make test          # Run Python tests
```

## Next Steps

After setup:

1. **Load Real Data**: Run the data pipeline in Dagster
2. **Explore Data**: Use pgweb or dbt docs to browse
3. **Customize UI**: Edit components in `webapp/src/components/`
4. **Add Features**: Extend dashboard in `webapp/src/app/dashboard/`
5. **Deploy**: Configure production PostgreSQL and hosting

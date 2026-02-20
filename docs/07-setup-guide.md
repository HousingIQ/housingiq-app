# Setup Guide

Complete guide to setting up HousingIQ for local development.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18+ | Required for Next.js webapp |
| **Docker & Docker Compose** | Latest | For PostgreSQL database |
| **Python** | 3.11+ | For data platform (Conda recommended) |
| **Git** | Latest | Version control |
| **Google Cloud Account** | - | Optional: for Google OAuth |

## Quick Start (5 Minutes)

For those who want to get up and running fast:

```bash
# 1. Clone and navigate
git clone <your-repo-url>
cd housingiq-app

# 2. One-command setup (installs everything, starts database, creates test user)
make setup

# 3. Start all services
make dev
```

This starts:
- **PostgreSQL**: `localhost:5432`
- **pgweb** (DB UI): http://localhost:8081
- **Next.js Webapp**: http://localhost:3000
- **Dagster UI**: http://localhost:3001

**Test Login:**
- Email: `test@housingiq.com`
- Password: `TestPassword123!`

---

## Step-by-Step Setup

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd housingiq-app
```

### Step 2: Start PostgreSQL Database

```bash
make up
```

This starts:
- **PostgreSQL 16** on port `5432`
- **pgweb** (database browser) on http://localhost:8081

Verify it's running:
```bash
docker compose ps
# Should show: housingiq-postgres and housingiq-pgweb running
```

### Step 3: Set Up Webapp

```bash
cd webapp
npm install
```

> **Note**: If you encounter peer dependency warnings about React 19, run:
> ```bash
> npm install --legacy-peer-deps
> ```

### Step 4: Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `webapp/.env.local`:

```env
# Database (default works with Docker Compose)
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5432/housingiq

# NextAuth.js (generate a random string for AUTH_SECRET)
AUTH_SECRET=your-super-secret-key-at-least-32-characters-long
AUTH_URL=http://localhost:3000

# Google OAuth (optional - email/password works without this)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Chat (optional - required for /dashboard/chat feature)
AI_GATEWAY_API_KEY=your-ai-gateway-api-key
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

### Step 5: Push Database Schema

```bash
npm run db:push
```

Expected output:
```
[✓] Changes applied to database
```

### Step 6: Seed Test User

```bash
npm run db:seed-test-user
```

This creates a test account:
- Email: `test@housingiq.com`
- Password: `TestPassword123!`

### Step 7: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## Setting Up Google OAuth (Optional)

Email/password authentication works without Google OAuth. Set this up if you want "Sign in with Google".

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "HousingIQ"

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services → OAuth consent screen**
2. Select **External** user type
3. Fill in:
   - App name: `HousingIQ`
   - User support email: your email
   - Developer contact email: your email
4. Click **Save and Continue** through all steps

### 3. Create OAuth Credentials

1. Navigate to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Configure:
   - Application type: **Web application**
   - Name: `HousingIQ Local`
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Copy **Client ID** and **Client Secret** to `.env.local`

---

## Setting Up Data Platform

The data platform ingests and transforms Zillow housing data.

### 1. Create Python Environment

**Using Conda (Recommended):**
```bash
conda create -n housingiq python=3.11 -y
conda activate housingiq
```

**Using venv:**
```bash
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# or .venv\Scripts\activate  # Windows
```

### 2. Install Data Platform

```bash
cd data-platform
pip install -e ".[dev]"
```

### 3. Start Dagster UI

From the `housingiq-app` root directory:
```bash
make dagster
```

Or from `data-platform/`:
```bash
DAGSTER_HOME=$(pwd) dagster dev -m housingiq_dagster.definitions -p 3001
```

Open http://localhost:3001

### 4. Run Data Pipeline

**Option A: Dagster UI (Recommended)**
1. Open http://localhost:3001
2. Navigate to **Assets**
3. Select all assets
4. Click **Materialize selected**

**Option B: Command Line**
```bash
make materialize
```

This runs the complete pipeline:
1. **Scrape** Zillow Research page for CSV URLs
2. **Download** ZHVI and ZORI CSV files
3. **Transform** to Parquet with Polars (add YoY/MoM calculations)
4. **Load** to PostgreSQL `app.*` tables

---

## All-in-One Commands

### From Root (`housingiq-app/`)

**Quick Start:**

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make setup` | First-time setup (installs data-platform + webapp, pushes schema, seeds test user) |
| `make dev` | Start all services in parallel (PostgreSQL + pgweb + webapp + Dagster) |

**Infrastructure:**

| Command | Description |
|---------|-------------|
| `make up` | Start PostgreSQL + pgweb |
| `make down` | Stop all Docker services |
| `make logs` | View Docker service logs (follow mode) |
| `make psql` | Connect to PostgreSQL CLI |
| `make clean` | Remove Docker volumes (reset database) |

**Individual Services:**

| Command | Description |
|---------|-------------|
| `make webapp` | Start Next.js only (port 3000) |
| `make dagster` | Start Dagster only (port 3001) |

**Database Operations:**

| Command | Description |
|---------|-------------|
| `make db-push` | Push Drizzle schema to database |
| `make db-seed` | Seed test user |
| `make db-studio` | Open Drizzle Studio |

**Data Pipeline:**

| Command | Description |
|---------|-------------|
| `make materialize` | Materialize all Dagster assets |

### What `make setup` Does

```
1. Starts PostgreSQL (make up)
2. Waits 5 seconds for DB to be ready
3. Installs data-platform: cd data-platform && pip install -e ".[dev]"
4. Installs webapp: cd webapp && npm install
5. Pushes schema: cd webapp && npm run db:push
6. Seeds test user: cd webapp && npm run db:seed-test-user
```

### What `make dev` Does

```
1. Starts PostgreSQL + pgweb (make up)
2. Starts webapp and Dagster in parallel:
   - webapp: cd webapp && npm run dev (port 3000)
   - dagster: cd data-platform && dagster dev -p 3001
3. Press Ctrl+C to stop all services
```

### From `data-platform/`

**Setup:**

| Command | Description |
|---------|-------------|
| `make help` | Show all commands |
| `make setup` | Full setup (install dependencies) |
| `make install` | Install Python dependencies |

**Dagster:**

| Command | Description |
|---------|-------------|
| `make dagster` | Start Dagster webserver |
| `make dagster-materialize` | Materialize all assets |

**Data Ingestion:**

| Command | Description |
|---------|-------------|
| `make scrape` | Scrape Zillow URLs and save manifest |
| `make download` | Download Zillow data (default categories) |
| `make download-all` | Download all Zillow data (all categories) |
| `make transform` | Transform downloaded data |

**Great Expectations:**

| Command | Description |
|---------|-------------|
| `make gx` | Run Great Expectations validation |
| `make gx-docs` | Build and open GX data docs |

**Testing & Code Quality:**

| Command | Description |
|---------|-------------|
| `make test` | Run pytest |
| `make test-cov` | Run pytest with coverage |
| `make lint` | Run linter (ruff) |
| `make lint-fix` | Fix linting issues |
| `make format` | Format code |
| `make typecheck` | Run type checker (mypy) |

**Cleanup:**

| Command | Description |
|---------|-------------|
| `make clean` | Clean all generated files |
| `make clean-data` | Clean downloaded data only |

---

## Database Management

### View Database

**Option 1: pgweb (Web UI)**
- URL: http://localhost:8081
- Pre-configured with Docker Compose

**Option 2: Drizzle Studio**
```bash
cd webapp
npm run db:studio
```
Opens https://local.drizzle.studio

**Option 3: psql CLI**
```bash
make psql
# or
docker compose exec postgres psql -U housingiq -d housingiq
```

### Database Schema

After running the data pipeline, you'll have:

| Table | Description |
|-------|-------------|
| `public.users` | User accounts (auth) |
| `app.regions` | Geographic regions (~450 popular regions) |
| `app.zhvi_values` | Home value time series (~1.5M rows) |
| `app.zori_values` | Rent value time series |
| `app.market_summary` | Pre-aggregated dashboard metrics (~450 rows) |

### Reset Database

```bash
# From housingiq-app root
make clean        # Remove Docker volumes
make up           # Start fresh PostgreSQL
cd webapp
npm run db:push   # Push schema
npm run db:seed-test-user  # Create test user
```

---

## Verification Checklist

### Webapp ✓

- [ ] Docker containers running (`docker compose ps`)
- [ ] Database accessible (http://localhost:8081)
- [ ] `.env.local` configured with secrets
- [ ] Schema pushed (`npm run db:push` succeeded)
- [ ] Test user created (`npm run db:seed-test-user`)
- [ ] Dev server running (`npm run dev`)
- [ ] Landing page loads (http://localhost:3000)
- [ ] Can log in with test user
- [ ] Dashboard accessible after login

### Data Platform ✓

- [ ] Python environment activated (`conda activate housingiq`)
- [ ] Dependencies installed (`pip install -e ".[dev]"`)
- [ ] Dagster UI loads (http://localhost:3001)
- [ ] All assets visible in Dagster
- [ ] Can materialize assets without errors
- [ ] Data appears in `app.*` tables

---

## Troubleshooting

### Port Already in Use

**Port 5432 (PostgreSQL):**
```bash
# Find what's using the port
lsof -i :5432

# Option 1: Stop the conflicting service
# Option 2: Change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead

# Update DATABASE_URL in .env.local
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5433/housingiq
```

**Port 3000 (Next.js):**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or run on different port
npm run dev -- -p 3001
```

### Docker Issues

```bash
# Check container status
docker compose ps

# View logs
docker compose logs postgres
docker compose logs -f  # Follow logs

# Restart all containers
docker compose down && docker compose up -d

# Full reset (removes data!)
docker compose down -v
docker compose up -d
```

### Database Connection Error

```bash
# Test connection
docker compose exec postgres psql -U housingiq -d housingiq -c "SELECT 1"

# Check DATABASE_URL is correct
cat webapp/.env.local | grep DATABASE_URL
```

### npm Install Errors

**React 19 Peer Dependency Warnings:**
```bash
npm install --legacy-peer-deps
```

**Permission Errors:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

### Google OAuth Not Working

Verify:
1. Redirect URI matches exactly: `http://localhost:3000/api/auth/callback/google`
2. Client ID and Secret are correct (no extra spaces)
3. OAuth consent screen is published (not in testing mode for external users)
4. AUTH_URL is `http://localhost:3000` (not `https`)

### Dagster Assets Failing

```bash
# Check logs in Dagster UI or terminal
# Common issues:

# 1. Database not running
docker compose ps  # Ensure postgres is up

# 2. Wrong working directory
cd data-platform
DAGSTER_HOME=$(pwd) dagster dev -m housingiq_dagster.definitions

# 3. Missing data files (run scraper/downloader first)
# Materialize assets in order: scraped → downloaded → transformed → database
```

---

## Development Workflow

### Daily Development

```bash
# 1. Start services (if not running)
make up

# 2. Start webapp
cd webapp && npm run dev

# 3. (Optional) Start Dagster in another terminal
make dagster

# 4. Make changes, view at http://localhost:3000
# Hot reload is enabled - changes appear instantly

# 5. Stop when done
make down
```

### After Pulling New Code

```bash
# Update dependencies
cd webapp && npm install
cd ../data-platform && pip install -e ".[dev]"

# Apply any schema changes
cd webapp && npm run db:push
```

### Running Tests

```bash
# Webapp (ESLint)
cd webapp && npm run lint

# Data Platform (pytest)
cd data-platform && make test
```

---

## Environment Files Reference

### `webapp/.env.local`

```env
# Database Connection
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5432/housingiq

# NextAuth.js Configuration
AUTH_SECRET=generate-a-random-32-character-string
AUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Chat (optional - for /dashboard/chat)
AI_GATEWAY_API_KEY=your-ai-gateway-api-key
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

### `data-platform/.env` (Optional)

```env
# Override database URL if needed
DATABASE_URL=postgresql://housingiq:housingiq@localhost:5432/housingiq
```

---

## Next Steps

After completing setup:

1. **Load Data**: Run the Dagster pipeline to populate the database with Zillow data
2. **Explore Dashboard**: Visit http://localhost:3000/dashboard to see market analytics
3. **Try AI Chat**: Visit http://localhost:3000/dashboard/chat (requires AI_GATEWAY_API_KEY + Upstash)
4. **Browse Data**: Use pgweb (http://localhost:8081) or Drizzle Studio to explore tables
5. **Customize**: Edit components in `webapp/src/components/`
6. **Add Features**: Extend the dashboard in `webapp/src/app/dashboard/`

## Docker Full-Stack Deployment

For running everything in Docker:

```bash
# Build all images
make docker-build

# Start all services
make docker-up

# Initialize schema and seed data
make docker-init
```

This starts PostgreSQL, pgweb, webapp (port 3000), Dagster webserver (port 3001), and Dagster daemon.

## Related Documentation

- [Architecture Overview](./02-architecture.md)
- [Database Schema](./03-database-schema.md)
- [Data Platform](./09-data-platform.md)
- [API Reference](./08-api-reference.md)

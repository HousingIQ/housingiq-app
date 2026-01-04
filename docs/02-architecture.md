# System Architecture

## Table of Contents

1. [Full System Architecture](#full-system-architecture)
2. [Component Layers](#component-layers)
3. [Data Platform Architecture](#data-platform-architecture)
4. [Web Application Architecture](#web-application-architecture)
5. [Database Architecture](#database-architecture)
6. [Authentication Flow](#authentication-flow)
7. [Data Flow](#data-flow)
8. [Deployment Architecture](#deployment-architecture)

---

## Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL DATA SOURCES                             │
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐   │
│  │  Zillow Research │     │   Redfin (Future)│     │  Census (Future) │   │
│  │     CSV Files    │     │    CSV/API       │     │       API        │   │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA PLATFORM LAYER                               │
│                        (Dagster + Polars + Great Expectations)               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  DAGSTER ORCHESTRATION (localhost:3001)                            │    │
│  │  Software-Defined Assets with Automatic Lineage                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                 │                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  INGESTION LAYER (housingiq_dagster/assets/zillow.py)             │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │  1. Zillow Scraper    → Discover CSV URLs                    │ │    │
│  │  │  2. Zillow Downloader → Fetch CSVs to data/zhvi/, data/zori/ │ │    │
│  │  │  3. Zillow Transformer → Parse CSVs → Parquet files          │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                 │                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  LOCAL DATA LAKE (data/processed/*.parquet)                       │    │
│  │  • zhvi_regions.parquet  • zhvi_values.parquet                    │    │
│  │  • zori_regions.parquet  • zori_values.parquet                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                 │                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  POLARS TRANSFORMATIONS (housingiq_dagster/assets/transforms.py)  │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │  • dim_regions        → Dimension table with display names   │ │    │
│  │  │  • fct_zhvi_values    → Add YoY/MoM calculations             │ │    │
│  │  │  • fct_zori_values    → Add YoY/MoM calculations             │ │    │
│  │  │  • market_summary     → Pre-aggregated dashboard metrics     │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                 │                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  GREAT EXPECTATIONS VALIDATION                                     │    │
│  │  • Schema validation  • Value range checks  • Completeness tests  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                 │                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  DATABASE LOADING (housingiq_dagster/assets/database.py)          │    │
│  │  • app.regions  • app.zhvi_values  • app.zori_values              │    │
│  │  • app.market_summary (via ADBC for fast bulk insert)             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER (PostgreSQL 16)                       │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  app.* Schema (Serving Layer)                                      │    │
│  │  • regions          • zhvi_values                                  │    │
│  │  • zori_values      • market_summary                               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  public Schema (Auth)                                              │    │
│  │  • users                                                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       WEB APPLICATION LAYER (Next.js 15)                     │
│                              (localhost:3000)                                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  SERVER LAYER                                                       │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │  API Routes (src/app/api/*)                                  │ │    │
│  │  │  • /api/market/all           → List all markets              │ │    │
│  │  │  • /api/market/[regionId]    → Single market details         │ │    │
│  │  │  • /api/market/compare       → Compare markets               │ │    │
│  │  │  • /api/market/rankings      → Market rankings               │ │    │
│  │  │  • /api/regions/search       → Location search               │ │    │
│  │  │  • /api/auth/*               → NextAuth.js endpoints         │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │  Drizzle ORM (src/lib/db/)                                   │ │    │
│  │  │  • schema.ts  → Type-safe schema definitions                 │ │    │
│  │  │  • index.ts   → Database client                              │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │  NextAuth.js v5 (src/lib/auth/)                              │ │    │
│  │  │  • config.ts  → Auth providers (Google OAuth, Credentials)   │ │    │
│  │  │  • index.ts   → Auth utilities                               │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                 │                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  CLIENT LAYER (React Server Components + Client Components)        │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │  Pages (src/app/)                                            │ │    │
│  │  │  • /                  → Landing page                         │ │    │
│  │  │  • /login             → Login/signup                         │ │    │
│  │  │  • /dashboard         → Main dashboard (protected)           │ │    │
│  │  │  • /dashboard/compare → Market comparison                    │ │    │
│  │  │  • /dashboard/rankings → Market rankings                     │ │    │
│  │  │  • /dashboard/calculator → ROI calculator                    │ │    │
│  │  │  • /dashboard/map     → Map view (future)                    │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │  Components (src/components/)                                │ │    │
│  │  │  • LocationSearchBar    • MarketOverviewCard                │ │    │
│  │  │  • PriceTrendChart      • ui/* (shadcn/ui components)        │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Google OAuth 2.0                                                   │    │
│  │  • User authentication  • Profile information                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Layers

### 1. Data Platform Layer

**Purpose**: Extract, transform, and load housing market data

**Components**:
- **Dagster**: Orchestration and asset management
- **Python Ingestion**: Custom extractors for data sources
- **Polars**: High-performance DataFrame transformations
- **Great Expectations**: Data quality validation
- **Parquet**: Columnar storage for intermediate data

**Key Files**:
```
data-platform/
├── housingiq_dagster/
│   ├── assets/
│   │   ├── zillow.py        # Scraper, downloader, transformer
│   │   ├── transforms.py    # Polars transformations
│   │   └── database.py      # PostgreSQL loading
│   ├── definitions.py       # Dagster definitions
│   └── schedules.py         # Scheduled jobs
├── ingestion/sources/zillow/
│   ├── scraper.py          # Discover CSV URLs
│   ├── downloader.py       # Download CSVs
│   ├── transformer.py      # Parse CSV → Parquet
│   └── schemas.py          # Pydantic models
└── great_expectations/
    └── expectations/        # Validation suites
```

### 2. Database Layer

**Purpose**: Persistent storage for both raw and serving data

**Schema Design**:
- `app.*` schema: Serving layer (optimized for webapp queries)
- `public.*` schema: Authentication tables

**Connection**: PostgreSQL 16 via Docker Compose

### 3. Web Application Layer

**Purpose**: User interface and API

**Framework**: Next.js 15 with App Router
- **Server Components**: Default rendering mode
- **Client Components**: Interactive elements
- **API Routes**: Backend endpoints
- **Middleware**: Authentication checks

**Key Patterns**:
- Server-side rendering (SSR) for SEO
- Client-side data fetching for interactivity
- Optimistic UI updates
- Type-safe database queries with Drizzle ORM

---

## Data Platform Architecture

### Asset Dependency Graph

```
zillow_zhvi_scraped
       ↓
zillow_zhvi_downloaded
       ↓
zillow_zhvi_transformed
       ↓
┌──────┴──────┬─────────┐
│             │         │
dim_regions   fct_zhvi_values   fct_zori_values
│             │         │
└──────┬──────┴─────────┘
       ↓
market_summary
       ↓
┌──────┴──────┬─────────┬──────────┐
│             │         │          │
app_regions   app_zhvi   app_zori   app_market_summary
       │             │         │          │
       └──────┬──────┴─────────┴──────────┘
              ↓
       PostgreSQL app.* schema
```

### Transformation Pipeline (Polars)

**Why Polars?**
- 10-100x faster than Pandas
- Memory efficient (lazy evaluation)
- Multi-threaded by default
- Better error messages
- Same code runs on laptop and production

**Example Transform** (`fct_zhvi_values`):
```python
df_transformed = (
    df
    .sort(["region_id", "date"])
    .with_columns([
        # Previous month value
        pl.col("value")
        .shift(1)
        .over("region_id")
        .alias("prev_month_value"),
        
        # Previous year value (12 months ago)
        pl.col("value")
        .shift(12)
        .over("region_id")
        .alias("prev_year_value"),
    ])
    .with_columns([
        # Month-over-month change %
        (
            (pl.col("value") - pl.col("prev_month_value"))
            / pl.col("prev_month_value")
            * 100
        ).alias("mom_change_pct"),
        
        # Year-over-year change %
        (
            (pl.col("value") - pl.col("prev_year_value"))
            / pl.col("prev_year_value")
            * 100
        ).alias("yoy_change_pct"),
    ])
)
```

### Data Quality Gates

**Great Expectations** validates data before loading:

```python
# Example expectations for ZHVI values
expectations = [
    expect_column_values_to_not_be_null("region_id"),
    expect_column_values_to_be_between("value", min_value=0, max_value=10_000_000),
    expect_column_values_to_be_between("yoy_change_pct", min_value=-50, max_value=50),
    expect_table_row_count_to_be_between(min_value=100_000),
]
```

---

## Web Application Architecture

### Next.js 15 App Router

**Routing Structure**:
```
src/app/
├── page.tsx                   # Landing page (/)
├── login/page.tsx             # Login (/login)
├── signup/page.tsx            # Signup (/signup)
├── dashboard/
│   ├── page.tsx              # Dashboard (/dashboard)
│   ├── compare/page.tsx      # Compare (/dashboard/compare)
│   ├── rankings/page.tsx     # Rankings (/dashboard/rankings)
│   ├── calculator/page.tsx   # Calculator (/dashboard/calculator)
│   └── layout.tsx            # Shared dashboard layout
└── api/
    ├── auth/[...nextauth]/   # NextAuth.js catch-all
    ├── market/
    │   ├── all/route.ts      # GET /api/market/all
    │   ├── [regionId]/route.ts # GET /api/market/:regionId
    │   ├── compare/route.ts  # POST /api/market/compare
    │   └── rankings/route.ts # GET /api/market/rankings
    └── regions/
        └── search/route.ts   # GET /api/regions/search
```

### Server vs Client Components

**Server Components** (default):
- No JavaScript sent to client
- Direct database access
- Async/await for data fetching
- Use for: layouts, static pages, data fetching

**Client Components** (`'use client'`):
- Interactive elements
- React hooks (useState, useEffect)
- Browser APIs
- Use for: forms, charts, search bars, modals

**Example**:
```typescript
// Server Component (default)
export default async function DashboardPage() {
  const marketData = await db.query.marketSummary.findMany();
  return <MarketOverviewCard data={marketData} />;
}

// Client Component
'use client';
export function LocationSearchBar() {
  const [query, setQuery] = useState('');
  // ... interactive logic
}
```

### API Routes

**Pattern**: File-based routing in `app/api/`

**Example** (`app/api/market/all/route.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db, marketSummary } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const geographyLevel = searchParams.get('geographyLevel') || 'State';
  
  const results = await db
    .select()
    .from(marketSummary)
    .where(eq(marketSummary.geographyLevel, geographyLevel));
  
  return NextResponse.json({ data: results });
}
```

---

## Database Architecture

### Schema Design

**Principle**: Keep it simple for the webapp. Complex transformations happen in Polars before loading.

#### `app.regions` (Dimension Table)

```sql
CREATE TABLE app.regions (
    region_id VARCHAR(100) PRIMARY KEY,
    region_name VARCHAR(255),
    display_name VARCHAR(500),        -- Formatted for UI
    geography_level VARCHAR(50),      -- 'State', 'Metro', 'County', 'City'
    state VARCHAR(2),                 -- State code (TX, CA, etc.)
    state_name VARCHAR(100),
    city VARCHAR(255),
    county VARCHAR(255),
    metro VARCHAR(255),
    size_rank INTEGER                 -- Population rank
);

CREATE INDEX idx_regions_geography ON app.regions(geography_level);
CREATE INDEX idx_regions_state ON app.regions(state);
```

#### `app.zhvi_values` (Fact Table - Home Values)

```sql
CREATE TABLE app.zhvi_values (
    region_id VARCHAR(100),
    date DATE,
    value REAL,                       -- Home value in USD
    geography_level VARCHAR(50),
    home_type VARCHAR(50),            -- 'All Homes', 'Single Family', etc.
    tier VARCHAR(50),                 -- 'Mid-Tier', 'Top-Tier', etc.
    bedrooms INTEGER,
    smoothed BOOLEAN,
    seasonally_adjusted BOOLEAN,
    frequency VARCHAR(20),
    mom_change_pct REAL,              -- Month-over-month change %
    yoy_change_pct REAL               -- Year-over-year change %
);

CREATE INDEX idx_zhvi_region ON app.zhvi_values(region_id);
CREATE INDEX idx_zhvi_date ON app.zhvi_values(date);
```

#### `app.zori_values` (Fact Table - Rent Values)

Similar structure to `zhvi_values` but for rent data.

#### `app.market_summary` (Pre-Aggregated)

```sql
CREATE TABLE app.market_summary (
    region_id VARCHAR(100) PRIMARY KEY,
    region_name VARCHAR(255),
    display_name VARCHAR(500),
    geography_level VARCHAR(50),
    state_code VARCHAR(2),
    state_name VARCHAR(100),
    metro VARCHAR(255),
    size_rank INTEGER,
    
    -- Latest home value metrics
    current_home_value REAL,
    home_value_yoy_pct REAL,
    home_value_mom_pct REAL,
    home_value_date DATE,
    
    -- Latest rent metrics
    current_rent_value REAL,
    rent_yoy_pct REAL,
    rent_mom_pct REAL,
    rent_value_date DATE,
    
    -- Derived metrics
    price_to_rent_ratio REAL,
    gross_rent_yield_pct REAL,
    market_classification VARCHAR(20)  -- 'Hot', 'Warm', 'Cold'
);

CREATE INDEX idx_market_summary_geography ON app.market_summary(geography_level);
CREATE INDEX idx_market_summary_classification ON app.market_summary(market_classification);
```

#### `public.users` (Authentication)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    image TEXT,                       -- Google profile picture
    password_hash VARCHAR(255),       -- For email/password auth
    google_id VARCHAR(255) UNIQUE,    -- For Google OAuth
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Drizzle ORM Schema

**Type-safe queries** with full IntelliSense:

```typescript
// src/lib/db/schema.ts
export const regions = appSchema.table('regions', {
  regionId: varchar('region_id', { length: 100 }).primaryKey(),
  regionName: varchar('region_name', { length: 255 }),
  displayName: varchar('display_name', { length: 500 }),
  geographyLevel: varchar('geography_level', { length: 50 }),
  // ...
});

export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
```

**Query Example**:
```typescript
// Type-safe, auto-complete works!
const states = await db
  .select()
  .from(regions)
  .where(eq(regions.geographyLevel, 'State'))
  .orderBy(regions.sizeRank);
```

---

## Authentication Flow

### NextAuth.js v5 (Beta)

**Providers**:
1. **Google OAuth**: Primary method
2. **Credentials**: Email/password fallback

**Flow**:
```
┌──────────┐
│  User    │
│ clicks   │
│ "Login"  │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│ Next.js /login  │
│     page        │
└────┬────────────┘
     │
     ├───── Google OAuth ─────┐
     │                        ▼
     │              ┌─────────────────┐
     │              │ Google OAuth 2.0│
     │              │   (redirect)    │
     │              └────┬────────────┘
     │                   │
     │                   ▼
     │              ┌─────────────────┐
     │              │ User authorizes │
     │              │  (Google page)  │
     │              └────┬────────────┘
     │                   │
     │                   ▼
     │              ┌─────────────────┐
     │              │  Callback URL   │
     │              │ /api/auth/cb... │
     │              └────┬────────────┘
     │                   │
     ├<──────────────────┘
     │
     ▼
┌─────────────────┐
│ NextAuth.js     │
│ - Verify token  │
│ - Find/create   │
│   user in DB    │
│ - Issue session │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Set session    │
│  cookie         │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Redirect to     │
│ /dashboard      │
└─────────────────┘
```

**Configuration** (`src/lib/auth/config.ts`):
```typescript
export const authOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      // Custom email/password logic
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Add user ID to session
      session.user.id = token.sub;
      return session;
    },
  },
};
```

---

## Data Flow

### End-to-End Data Flow

**1. Data Ingestion** (Monthly):
```
Zillow publishes new CSV → Dagster schedule triggers → Scraper finds URLs
→ Downloader fetches CSVs → Transformer parses to Parquet
→ Saves to data/processed/
```

**2. Data Transformation** (After ingestion):
```
Polars reads zhvi_values.parquet → Window functions calculate YoY/MoM
→ Writes fct_zhvi_values.parquet → Great Expectations validates
→ Passes ✓ → Continue to loading
```

**3. Database Loading**:
```
Polars reads fct_*.parquet → ADBC bulk insert to PostgreSQL
→ app.zhvi_values, app.regions, etc.
```

**4. Web Application Query** (Real-time):
```
User visits /dashboard → Server Component fetches market_summary
→ Drizzle ORM queries PostgreSQL → Returns typed data
→ React renders <MarketOverviewCard />
```

**5. Interactive User Action**:
```
User types "Austin" in search → Client Component debounces input
→ Fetch /api/regions/search?q=Austin → Drizzle queries app.regions
→ Returns matches → React updates autocomplete dropdown
```

---

## Deployment Architecture

### Local Development

**Services**:
- PostgreSQL: `localhost:5432` (Docker)
- pgweb: `localhost:8081` (Docker)
- Next.js: `localhost:3000`
- Dagster: `localhost:3001`

**Start Command**:
```bash
make dev  # Starts all services
```

### Production (Future)

**Planned Stack**:
- **Database**: Managed PostgreSQL (AWS RDS, Neon, Supabase)
- **Webapp**: Vercel (Next.js native support)
- **Data Platform**: Modal, AWS ECS, or Cloud Run (containerized Dagster)
- **Storage**: S3 for Parquet files
- **Secrets**: Environment variables via platform

**Considerations**:
- Separate staging and production environments
- CI/CD with GitHub Actions
- Database migrations with Drizzle Kit
- Monitoring with Sentry + Dagster Cloud (optional)

---

## Performance Characteristics

| Layer | Metric | Performance |
|-------|--------|-------------|
| **Data Ingestion** | Full Zillow download | ~2-5 minutes |
| **Polars Transforms** | 1M rows YoY calculation | ~500ms |
| **Database Load** | Bulk insert 1M rows | ~5 seconds (ADBC) |
| **API Response** | Market summary query | <50ms |
| **Page Load** | Dashboard SSR | <300ms (cold) |
| **Chart Render** | 100 data points | <50ms |

---

## Technology Decisions

### Why Polars Instead of dbt?

| Factor | dbt | Polars |
|--------|-----|--------|
| **Speed** | SQL engine dependent | 10-100x faster than Pandas |
| **Memory** | Loads full dataset | Lazy evaluation, streaming |
| **Development** | SQL + Jinja | Pure Python, better IDE support |
| **Complexity** | Requires warehouse | Runs anywhere Python runs |
| **Testing** | dbt test | pytest with actual data |

**Decision**: Polars for this project size. Consider dbt for multi-user data teams.

### Why Dagster Instead of Airflow?

| Factor | Airflow | Dagster |
|--------|---------|---------|
| **Paradigm** | Tasks (imperative) | Assets (declarative) |
| **Type Safety** | Weak | Strong (Pydantic) |
| **Testing** | Complex | Unit test assets directly |
| **Lineage** | Manual | Automatic |
| **Local Dev** | Heavy (Docker) | Lightweight (pip install) |

**Decision**: Dagster for modern asset-based thinking and better DX.

### Why Next.js Instead of Separate Frontend/Backend?

| Factor | Separate | Next.js |
|--------|----------|---------|
| **Complexity** | 2 repos, 2 deploys | Single repo |
| **Type Safety** | Manual API contract | Shared types |
| **Performance** | Client-side rendering | SSR + RSC |
| **SEO** | Requires SSR setup | Built-in |
| **API Routes** | Separate Express/FastAPI | Co-located with pages |

**Decision**: Next.js for monolithic simplicity and excellent DX.

---

## Scalability Considerations

### Current Limitations (Local Development)

| Resource | Limit | Workaround |
|----------|-------|------------|
| **Geography Levels** | State/Metro/County/City only | Excluding Zip/Neighborhood saves 90% memory |
| **History** | All available years | Could limit to last 10 years |
| **Parquet Files** | ~5GB | Fine for local, S3 for production |
| **PostgreSQL** | Docker, single instance | Managed service for production |

### Production Scaling Strategy

**Horizontal Scaling**:
- Stateless Next.js instances behind load balancer
- Read replicas for database
- CDN for static assets

**Vertical Scaling**:
- Larger PostgreSQL instance
- More CPU/RAM for Dagster workers

**Data Partitioning**:
- Partition zhvi_values by date (monthly)
- Separate tables per geography level if needed

---

## Next Steps

To dive deeper into specific components:
- **Data Platform**: [09-data-platform.md](./09-data-platform.md)
- **Database Schema**: [03-database-schema.md](./03-database-schema.md)
- **Frontend**: [05-frontend.md](./05-frontend.md)
- **Authentication**: [04-authentication.md](./04-authentication.md)
- **API Reference**: [08-api-reference.md](./08-api-reference.md)

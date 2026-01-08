# HousingIQ Changelog

## [Unreleased] - 2026-01-08

### Phase 2: Market Pulse & Affordability Calculator

#### 🆕 New Data Categories Downloaded
- `market_temp_index` - Market Heat Index (0-100 scale)
- `mortgage_payment` - Monthly mortgage payments (5%, 10%, 20% down)
- `total_monthly_payment` - Total housing cost including taxes/insurance
- `new_homeowner_income_needed` - Income required to buy
- `new_renter_income_needed` - Income required to rent

#### 🆕 New Dagster Transform Assets

| Asset | Description | Output |
|-------|-------------|--------|
| `fct_market_heat_index` | Heat index with YoY/MoM, market temperature classification | 85,844 rows |
| `fct_affordability_metrics` | Combined mortgage, payment, income data | 3.3M rows |

#### 🆕 New Dagster Database Loading Assets

| Asset | PostgreSQL Table |
|-------|-----------------|
| `app_market_heat_index` | `app.market_heat_index` |
| `app_affordability_metrics` | `app.affordability_metrics` |

#### 🆕 New Pages

| Page | Route | Description |
|------|-------|-------------|
| Market Pulse | `/dashboard/market-pulse` | National temperature gauge, hottest/coolest markets |
| Affordability Calculator | `/dashboard/affordability` | Income calculator, rent vs buy, down payment scenarios |

#### 🆕 New API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/market/heat` | GET | Market heat index, hottest/coolest markets |
| `/api/market/affordability` | GET | Affordability metrics by region and down payment |

#### 📝 Modified Files

##### Database Schema
- **`/webapp/src/lib/db/schema.ts`**
  - Added `marketHeatIndex` table with heat_index, market_temperature
  - Added `affordabilityMetrics` table with metric_type, down_payment_pct
  - Added type exports: `MarketHeatIndexValue`, `AffordabilityMetric`

##### Dashboard Layout
- **`/webapp/src/app/dashboard/layout.tsx`**
  - Added "Market Pulse" navigation link
  - Added "Affordability" navigation link

##### Data Platform - Asset Exports
- **`/data-platform/housingiq_dagster/assets/__init__.py`**
  - Added exports for all new transform and database assets

#### 🆕 New Components

| Component | Location | Description |
|-----------|----------|-------------|
| Slider | `/webapp/src/components/ui/slider.tsx` | Income slider for affordability calculator |

---

### Database Changes (Phase 2)

#### New Table: `app.market_heat_index`
```sql
CREATE TABLE app.market_heat_index (
  region_id VARCHAR(100),
  date DATE,
  heat_index REAL,
  geography_level VARCHAR(50),
  mom_change REAL,
  yoy_change REAL,
  market_temperature VARCHAR(20)
);
```

#### New Table: `app.affordability_metrics`
```sql
CREATE TABLE app.affordability_metrics (
  region_id VARCHAR(100),
  date DATE,
  value REAL,
  geography_level VARCHAR(50),
  metric_type VARCHAR(50),
  down_payment_pct REAL,
  mom_change_pct REAL,
  yoy_change_pct REAL
);
```

---

### How to Activate Phase 2 Features

1. **Load data to PostgreSQL:**
   ```bash
   cd data-platform
   dagster asset materialize -m housingiq_dagster --select app_market_heat_index app_affordability_metrics
   ```

2. **Access New Pages:**
   - Market Pulse: http://localhost:3000/dashboard/market-pulse
   - Affordability: http://localhost:3000/dashboard/affordability

---

## [Previous] - 2026-01-04

### Phase 1A & 1B: Enhanced Features & Inventory Dashboard

#### 🆕 New Components

| Component | Path | Description |
|-----------|------|-------------|
| `BedroomComparisonChart` | `/webapp/src/components/BedroomComparisonChart.tsx` | Compares home values across 1-5+ bedroom configurations with trend visualization |
| `PropertyTypeAnalysis` | `/webapp/src/components/PropertyTypeAnalysis.tsx` | Single Family vs Condo/Co-op comparison with price premium analysis |
| `MarketHealthScore` | `/webapp/src/components/MarketHealthScore.tsx` | Custom 0-100 investment score combining appreciation, rent growth, P/R ratio, and yield |

#### 🆕 New Pages

| Page | Route | Description |
|------|-------|-------------|
| Inventory Dashboard | `/dashboard/inventory` | Complete inventory tracking page with trends, heat map, supply-demand index |

#### 🆕 New API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/market/[regionId]/bedrooms` | GET | Bedroom-based value comparison data |
| `/api/market/[regionId]/property-types` | GET | Property type comparison data |
| `/api/market/inventory` | GET | Inventory data (region-specific or national summary) |

#### 📝 Modified Files

##### Database Schema
- **`/webapp/src/lib/db/schema.ts`**
  - Added `inventoryValues` table for storing for-sale inventory data
  - Added `inventoryValuesRelations` for region relationships
  - Added type exports: `InventoryValue`, `NewInventoryValue`

##### Data Platform - Transforms
- **`/data-platform/housingiq_dagster/assets/transforms.py`**
  - Added `fct_inventory_values` asset for processing raw inventory CSV files
  - Calculates MoM and YoY changes for inventory

##### Data Platform - Database Loading
- **`/data-platform/housingiq_dagster/assets/database.py`**
  - Added `app_inventory_values` asset for loading inventory to PostgreSQL

##### Data Platform - Asset Exports
- **`/data-platform/housingiq_dagster/assets/__init__.py`**
  - Added exports for `fct_inventory_values` and `app_inventory_values`

##### Dashboard Layout
- **`/webapp/src/app/dashboard/layout.tsx`**
  - Added "Inventory" navigation link with Package icon

##### Main Dashboard Page
- **`/webapp/src/app/dashboard/page.tsx`**
  - Integrated `BedroomComparisonChart` component
  - Integrated `PropertyTypeAnalysis` component
  - Integrated `MarketHealthScore` widget after price trend chart

##### Inventory Dashboard Page (New Features)
- **`/webapp/src/app/dashboard/inventory/page.tsx`**
  - Added Supply-Demand Index with months of supply gauge
  - Added Days on Market estimate with market speed indicator
  - Added Inventory Heat Map (horizontal bar chart with color coding)
  - Geographic distribution visualization for top 20 metros

---

### Feature Details

#### BedroomComparisonChart
- Visualizes home values by bedroom count (1BR to 5+BR)
- Shows YoY change for each configuration
- Color-coded stat cards with trend indicators
- Investment insights highlighting best/slowest performers

#### PropertyTypeAnalysis  
- Compares Single Family, Condo/Co-op, and All Homes values
- Calculates price premium/discount between property types
- Historical trend line chart
- Investment insights on appreciation rates

#### MarketHealthScore (0-100 Scale)
- **Appreciation Score** (0-25): Based on YoY home value change
- **Rent Growth Score** (0-25): Based on YoY rent change
- **P/R Ratio Score** (0-25): Lower ratios score higher
- **Rent Yield Score** (0-25): Higher yields score higher
- Color-coded breakdown bars and market recommendation

#### Inventory Dashboard Features
1. **Region Selector**: Search and select any metro area
2. **Stats Cards**: Current inventory, YoY, MoM, 1-year comparison
3. **Supply-Demand Index**: 
   - Estimated months of supply
   - Visual gauge (0-10+ scale)
   - Market health classification (Seller's/Balanced/Buyer's)
4. **Days on Market Estimate**:
   - Based on inventory trends
   - Market speed indicator
   - Buyer tips
5. **Inventory Heat Map**:
   - Top 20 metros horizontal bar chart
   - Color-coded by relative inventory level
   - Interactive tooltips
6. **National Summary Table**:
   - Sortable by inventory or YoY change
   - Market signal badges
   - Click to drill down

---

### Database Changes

#### New Table: `app.inventory_values`
```sql
CREATE TABLE app.inventory_values (
  region_id VARCHAR(100),
  date DATE,
  inventory_count INTEGER,
  geography_level VARCHAR(50),
  home_type VARCHAR(50),
  smoothed BOOLEAN,
  frequency VARCHAR(20),
  mom_change_pct REAL,
  yoy_change_pct REAL
);
```

---

### Breaking Changes
None

### Deprecations
None

### Bug Fixes
- Fixed `react-simple-maps` SSR compatibility with React 19 using dynamic imports
- Fixed missing asset exports in Dagster causing inventory data not to process

---

### How to Activate New Features

1. **Process Inventory Data:**
   ```bash
   cd data-platform
   make dagster-materialize
   ```

2. **Restart Webapp:**
   ```bash
   cd webapp
   npm run dev
   ```

3. **Access New Pages:**
   - Inventory Dashboard: http://localhost:3000/dashboard/inventory
   - Main Dashboard now shows bedroom/property type charts when region selected


# HousingIQ - Next Implementation Plan

## Overview

This document outlines the planned features and components for upcoming development phases. Features are prioritized based on data availability and user value.

---

## Phase 2: Market Heat & Affordability (Priority: HIGH)

**Timeline:** 1-2 weeks  
**Data Required:** `market_temp_index`, `mortgage_payment`, `total_monthly_payment`, `new_homeowner_income_needed`, `new_renter_income_needed`

### 2.1 Download New Data Categories

Add to `DEFAULT_CATEGORIES` in `/data-platform/ingestion/sources/zillow/config.py`:
- `market_temp_index` - Zillow Market Heat Index
- `mortgage_payment` - Monthly mortgage payments (5%, 10%, 20% down)
- `total_monthly_payment` - Total housing cost including taxes/insurance
- `new_homeowner_income_needed` - Income required to buy
- `new_renter_income_needed` - Income required to rent

### 2.2 Market Pulse Dashboard

**Route:** `/dashboard/market-pulse`

| Component | Description |
|-----------|-------------|
| `MarketHeatMap` | US map colored by heat index (react-simple-maps) |
| `MarketTemperatureGauge` | 0-100 temperature visualization |
| `HottestMarketsTable` | Top 10 hottest markets |
| `CoolestMarketsTable` | Top 10 coolest markets |
| `HeatTrendChart` | Historical heat index over time |

**Features:**
- Real-time market temperature scores
- "Buy Now" vs "Wait" recommendations
- Heat index trend visualization
- Geographic heat distribution

### 2.3 Affordability Calculator

**Route:** `/dashboard/affordability`

| Component | Description |
|-----------|-------------|
| `AffordabilityCalculator` | Interactive cost breakdown |
| `RentVsBuyComparison` | Side-by-side cost analysis |
| `IncomeRequirementCard` | Required income to buy/rent |
| `BreakEvenAnalysis` | Years to break even buying vs renting |
| `DownPaymentScenarios` | Compare 5%, 10%, 20% down options |

**Features:**
- Location-based calculations
- Down payment slider (5%-20%)
- Monthly payment breakdown (P&I, taxes, insurance, PMI)
- Income requirement check
- Rent vs Buy comparison with break-even timeline

---

## Phase 3: Forecasts & Advanced Analytics (Priority: MEDIUM)

**Timeline:** 2-3 weeks  
**Data Required:** `zhvf_growth`, `zorf_growth`, `zordi`, `new_listings`, `sales_count_now`

### 3.1 Download Forecast Data

Add to `DEFAULT_CATEGORIES`:
- `zhvf_growth` - Home value forecasts (1-year predictions)
- `zorf_growth` - Rent forecasts
- `zordi` - Renter Demand Index
- `new_listings` - New listings data
- `sales_count_now` - Sales transaction counts

### 3.2 Forecasts Dashboard

**Route:** `/dashboard/forecasts`

| Component | Description |
|-----------|-------------|
| `ForecastChart` | Historical + 12-month forecast with confidence bands |
| `ForecastSummaryCards` | Home value, rent, P/R ratio predictions |
| `ConfidenceIndicator` | Forecast reliability score |
| `ForecastComparisonTable` | Compare forecasts across regions |

**Features:**
- 12-month home value predictions
- Rent trend forecasts
- Confidence interval visualization
- Market direction indicators

### 3.3 Supply & Demand Dashboard (Enhanced)

**Route:** `/dashboard/supply-demand`

| Component | Description |
|-----------|-------------|
| `NewListingsTrendChart` | New listings over time |
| `SalesVolumeChart` | Monthly sales transactions |
| `AbsorptionRateCalculator` | Actual months of supply |
| `DemandIndexGauge` | ZORDI visualization |
| `SupplyDemandRatioChart` | Supply vs demand trends |

**Features:**
- Real sales data integration
- Accurate months of supply calculation
- Renter demand index tracking
- New listings velocity

---

## Phase 4: Investment Tools (Priority: MEDIUM)

**Timeline:** 2-3 weeks

### 4.1 Investment Analysis Page

**Route:** `/dashboard/invest`

| Component | Description |
|-----------|-------------|
| `InvestmentScorecard` | Comprehensive investment rating |
| `CashFlowCalculator` | Rental property cash flow analysis |
| `CapRateCalculator` | Capitalization rate by region |
| `ROIProjector` | 5/10/15 year ROI projections |
| `MarketRankings` | Best markets for investment |

**Features:**
- Investment opportunity scoring
- Rental yield analysis
- Cash flow projections
- Market comparison for investors
- Risk assessment

### 4.2 Portfolio Tracker

**Route:** `/dashboard/portfolio`

| Component | Description |
|-----------|-------------|
| `PropertyList` | User's saved properties |
| `PortfolioValueChart` | Total portfolio value over time |
| `AlertsManager` | Price/rent change notifications |
| `ReportGenerator` | PDF export of analysis |

**Features:**
- Save and track multiple properties
- Portfolio performance monitoring
- Custom alerts and notifications
- Exportable reports

---

## Phase 5: User Experience & Pro Features (Priority: LOW)

**Timeline:** 2-4 weeks

### 5.1 Enhanced Search & Discovery

| Feature | Description |
|---------|-------------|
| ZIP Code Unlock | Enable ZIP-level data for Pro users |
| Neighborhood Data | Neighborhood-level analysis |
| Advanced Filters | Filter by price range, growth rate, yield |
| Saved Searches | Save and recall search criteria |

### 5.2 Pro Subscription Features

| Feature | Description |
|---------|-------------|
| Email Alerts | Weekly market updates |
| API Access | Programmatic data access |
| Export Tools | CSV/Excel data export |
| Historical Data | Extended historical access |
| Custom Reports | Branded PDF reports |

### 5.3 Mobile Optimization

| Feature | Description |
|---------|-------------|
| Responsive Redesign | Mobile-first dashboard |
| PWA Support | Installable progressive web app |
| Push Notifications | Mobile alerts |

---

## Technical Debt & Improvements

### Data Platform
- [ ] Add data quality monitoring dashboards
- [ ] Implement incremental data updates (vs full refresh)
- [ ] Add data freshness alerts
- [ ] Optimize Polars transformations for larger datasets

### Webapp
- [ ] Add comprehensive error boundaries
- [ ] Implement data caching (React Query/SWR)
- [ ] Add loading skeletons for all components
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Add end-to-end tests (Playwright)

### Infrastructure
- [ ] Set up CI/CD pipeline
- [ ] Add staging environment
- [ ] Implement database backups
- [ ] Add monitoring and alerting (Sentry, etc.)

---

## Data Categories Reference

### Currently Downloaded & Processed ✅
| Category | Status | Tables |
|----------|--------|--------|
| `zhvi` | ✅ Active | `app.zhvi_values`, `app.regions` |
| `zori` | ✅ Active | `app.zori_values` |
| `invt_fs` | ✅ Active | `app.inventory_values` |

### Planned for Phase 2 📋
| Category | Files | Description |
|----------|-------|-------------|
| `market_temp_index` | Metro only | Market heat index (0-100) |
| `mortgage_payment` | Metro, State, County | Monthly mortgage by down payment |
| `total_monthly_payment` | Metro, State, County | Total housing cost |
| `new_homeowner_income_needed` | Metro | Income required to buy |
| `new_renter_income_needed` | Metro | Income required to rent |

### Planned for Phase 3 📋
| Category | Files | Description |
|----------|-------|-------------|
| `zhvf_growth` | Metro, Zip | 1-year home value forecast |
| `zorf_growth` | National | Rent forecast |
| `zordi` | Metro | Renter demand index |
| `new_listings` | Metro | New listings count |
| `sales_count_now` | Metro | Sales transaction count |

---

## Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Market Heat Dashboard | High | Medium | P1 |
| Affordability Calculator | High | Medium | P1 |
| Forecast Charts | Medium | Medium | P2 |
| Supply/Demand Enhancement | Medium | Low | P2 |
| Investment Tools | Medium | High | P3 |
| Portfolio Tracker | Low | High | P4 |
| Pro Features | Medium | High | P4 |

---

## Next Immediate Steps

1. **Download Phase 2 Data**
   ```bash
   # Update config.py DEFAULT_CATEGORIES
   DEFAULT_CATEGORIES = ["zhvi", "zori", "invt_fs", "market_temp_index", "mortgage_payment", "total_monthly_payment", "new_homeowner_income_needed", "new_renter_income_needed"]
   
   # Run download
   cd data-platform
   make download
   ```

2. **Create Transformers for New Data**
   - `fct_market_heat_index`
   - `fct_affordability_metrics`

3. **Build Market Pulse Dashboard**
   - Start with heat map visualization
   - Add temperature gauge component

4. **Build Affordability Calculator**
   - Interactive payment breakdown
   - Rent vs Buy comparison


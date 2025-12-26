from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta
import random

app = FastAPI(
    title="HousingIQ API",
    description="Housing Analytics Backend API",
    version="1.0.0",
)

# CORS configuration - allow frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "https://webapp-next-iota.vercel.app",   # Vercel production (no trailing slash!)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Pydantic Models (matching frontend types in use-housing-data.ts)
# =============================================================================

class HousingMetric(BaseModel):
    id: int
    date: str
    region: str
    medianPrice: float
    yoyChange: float
    inventory: int
    daysOnMarket: int


class MacroIndicator(BaseModel):
    id: int
    date: str
    indicatorName: str
    value: float


class Forecast(BaseModel):
    id: int
    forecastDate: str
    targetDate: str
    metric: str
    predictedValue: float
    confidenceLower: float
    confidenceUpper: float


class DashboardData(BaseModel):
    healthScore: float
    healthScoreTrend: float
    priceGrowth: float
    priceGrowthTrend: float
    inventoryLevel: str
    inventoryChange: float
    mortgageRate: float
    mortgageRateTrend: float


# =============================================================================
# Dummy Data Generation
# =============================================================================

def generate_housing_metrics() -> List[dict]:
    """Generate dummy housing metrics data."""
    regions = ["San Francisco", "Los Angeles", "Seattle", "Austin", "Denver", 
               "Phoenix", "Miami", "New York", "Boston", "Chicago"]
    metrics = []
    
    base_date = datetime.now()
    for i, region in enumerate(regions):
        for month_offset in range(12):
            date = base_date - timedelta(days=month_offset * 30)
            base_price = 500000 + (i * 100000) + random.randint(-50000, 50000)
            
            metrics.append({
                "id": len(metrics) + 1,
                "date": date.strftime("%Y-%m-%d"),
                "region": region,
                "medianPrice": base_price,
                "yoyChange": round(random.uniform(-5, 15), 2),
                "inventory": random.randint(500, 5000),
                "daysOnMarket": random.randint(15, 90),
            })
    
    return metrics


def generate_macro_indicators() -> List[dict]:
    """Generate dummy macro economic indicators."""
    indicators = [
        ("30Y Mortgage Rate", 6.5, 7.5),
        ("Unemployment Rate", 3.5, 5.0),
        ("CPI YoY", 2.5, 4.0),
        ("GDP Growth", 1.5, 3.5),
        ("Housing Starts (K)", 1200, 1600),
        ("Consumer Confidence", 95, 115),
    ]
    
    data = []
    base_date = datetime.now()
    
    for i, (name, low, high) in enumerate(indicators):
        for month_offset in range(12):
            date = base_date - timedelta(days=month_offset * 30)
            data.append({
                "id": len(data) + 1,
                "date": date.strftime("%Y-%m-%d"),
                "indicatorName": name,
                "value": round(random.uniform(low, high), 2),
            })
    
    return data


def generate_forecasts() -> List[dict]:
    """Generate dummy price forecasts."""
    forecasts = []
    regions = ["San Francisco", "Los Angeles", "Seattle", "Austin", "Denver"]
    metrics = ["medianPrice", "inventory", "daysOnMarket"]
    
    base_date = datetime.now()
    
    for region in regions:
        for metric in metrics:
            base_value = 500000 if metric == "medianPrice" else 1000
            
            for month_ahead in range(1, 13):
                target_date = base_date + timedelta(days=month_ahead * 30)
                predicted = base_value * (1 + random.uniform(-0.05, 0.15))
                
                forecasts.append({
                    "id": len(forecasts) + 1,
                    "forecastDate": base_date.strftime("%Y-%m-%d"),
                    "targetDate": target_date.strftime("%Y-%m-%d"),
                    "metric": metric,
                    "predictedValue": round(predicted, 2),
                    "confidenceLower": round(predicted * 0.9, 2),
                    "confidenceUpper": round(predicted * 1.1, 2),
                })
    
    return forecasts


# Cache the dummy data so it's consistent across requests
HOUSING_METRICS = generate_housing_metrics()
MACRO_INDICATORS = generate_macro_indicators()
FORECASTS = generate_forecasts()


# =============================================================================
# API Endpoints (matching frontend hooks in use-housing-data.ts)
# =============================================================================

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/api/metrics", response_model=List[HousingMetric])
async def get_housing_metrics():
    """
    Get housing metrics data.
    Used by: useHousingMetrics() hook
    """
    return HOUSING_METRICS


@app.get("/api/macro", response_model=List[MacroIndicator])
async def get_macro_indicators():
    """
    Get macroeconomic indicators.
    Used by: useMacroIndicators() hook
    """
    return MACRO_INDICATORS


@app.get("/api/forecasts", response_model=List[Forecast])
async def get_forecasts():
    """
    Get price forecasts.
    Used by: useForecasts() hook
    """
    return FORECASTS


@app.get("/api/dashboard")
async def get_dashboard_summary():
    """
    Get dashboard summary data.
    Provides the high-level metrics shown in dashboard cards.
    """
    return {
        "healthScore": 72,
        "healthScoreTrend": 3.2,
        "priceGrowth": 5.2,
        "priceGrowthTrend": -1.8,
        "inventoryLevel": "Low",
        "inventoryChange": 12.5,
        "mortgageRate": 6.89,
        "mortgageRateTrend": 0.15,
        "topMarkets": [
            {
                "city": "Austin",
                "state": "TX",
                "growth": 8.3,
                "risk": "Medium",
                "medianPrice": 542000,
                "inventory": 2450,
                "daysOnMarket": 28,
            },
            {
                "city": "Phoenix",
                "state": "AZ",
                "growth": 6.1,
                "risk": "Low",
                "medianPrice": 438000,
                "inventory": 4200,
                "daysOnMarket": 35,
            },
            {
                "city": "Tampa",
                "state": "FL",
                "growth": 7.8,
                "risk": "Medium",
                "medianPrice": 385000,
                "inventory": 3100,
                "daysOnMarket": 32,
            },
            {
                "city": "Nashville",
                "state": "TN",
                "growth": 5.9,
                "risk": "Low",
                "medianPrice": 465000,
                "inventory": 2800,
                "daysOnMarket": 30,
            },
            {
                "city": "Denver",
                "state": "CO",
                "growth": 4.2,
                "risk": "Low",
                "medianPrice": 595000,
                "inventory": 3500,
                "daysOnMarket": 38,
            },
            {
                "city": "Miami",
                "state": "FL",
                "growth": 9.1,
                "risk": "High",
                "medianPrice": 625000,
                "inventory": 2100,
                "daysOnMarket": 25,
            },
        ],
        "macroIndicators": [
            {"name": "Fed Funds Rate", "value": 5.25, "unit": "%", "change": 0, "trend": "stable"},
            {"name": "CPI (Inflation)", "value": 3.2, "unit": "%", "change": -0.3, "trend": "down"},
            {"name": "Unemployment", "value": 3.9, "unit": "%", "change": 0.1, "trend": "up"},
            {"name": "GDP Growth", "value": 2.8, "unit": "%", "change": 0.4, "trend": "up"},
            {"name": "10Y Treasury", "value": 4.35, "unit": "%", "change": -0.12, "trend": "down"},
            {"name": "Consumer Confidence", "value": 102.5, "unit": "", "change": 3.2, "trend": "up"},
        ],
        "alerts": [
            {
                "id": "1",
                "type": "warning",
                "title": "Overvaluation Signal",
                "message": "Austin market showing overvaluation signals. Price-to-income ratio exceeds historical average by 18%.",
                "timestamp": "2 hours ago",
                "region": "Austin, TX",
            },
            {
                "id": "2",
                "type": "info",
                "title": "Rate Sensitivity Alert",
                "message": "Miami market highly sensitive to rate changes. A 0.5% rate increase could reduce affordability by 8%.",
                "timestamp": "5 hours ago",
                "region": "Miami, FL",
            },
            {
                "id": "3",
                "type": "success",
                "title": "Market Recovery",
                "message": "Phoenix inventory levels normalizing. Days on market decreased 12% month-over-month.",
                "timestamp": "1 day ago",
                "region": "Phoenix, AZ",
            },
            {
                "id": "4",
                "type": "danger",
                "title": "Price Correction Risk",
                "message": "Boise showing early signs of price correction. Year-over-year growth turned negative.",
                "timestamp": "1 day ago",
                "region": "Boise, ID",
            },
        ],
        "priceTrends": [
            {"month": "Jan", "national": 385000, "forecast": None},
            {"month": "Feb", "national": 388000, "forecast": None},
            {"month": "Mar", "national": 392000, "forecast": None},
            {"month": "Apr", "national": 398000, "forecast": None},
            {"month": "May", "national": 405000, "forecast": None},
            {"month": "Jun", "national": 412000, "forecast": None},
            {"month": "Jul", "national": 418000, "forecast": None},
            {"month": "Aug", "national": 422000, "forecast": None},
            {"month": "Sep", "national": 425000, "forecast": None},
            {"month": "Oct", "national": 428000, "forecast": None},
            {"month": "Nov", "national": 430000, "forecast": None},
            {"month": "Dec", "national": 432000, "forecast": None},
            {"month": "Jan*", "national": 432000, "forecast": 435000},
            {"month": "Feb*", "national": 432000, "forecast": 438000},
            {"month": "Mar*", "national": 432000, "forecast": 442000},
        ],
    }


@app.get("/api/markets/{region}")
async def get_market_data(region: str):
    """
    Get detailed market data for a specific region.
    """
    metrics = [m for m in HOUSING_METRICS if m["region"].lower() == region.lower()]
    if not metrics:
        return {"error": f"Region '{region}' not found", "available_regions": list(set(m["region"] for m in HOUSING_METRICS))}
    return metrics


# =============================================================================
# Root endpoint with API documentation links
# =============================================================================

@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "HousingIQ API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "health": "/api/health",
            "metrics": "/api/metrics",
            "macro": "/api/macro",
            "forecasts": "/api/forecasts",
            "dashboard": "/api/dashboard",
            "market": "/api/markets/{region}",
        },
    }


# =============================================================================
# Main entry point for local development
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

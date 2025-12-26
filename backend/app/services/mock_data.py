"""Mock data service for development and testing.

This module provides dummy data generators that will be replaced
with actual database queries when the database is integrated.
"""

import random
from datetime import datetime, timedelta
from functools import lru_cache

from app.schemas.dashboard import (
    Alert,
    DashboardResponse,
    MacroIndicatorSummary,
    MarketSummary,
    PriceTrend,
)


class MockDataService:
    """Service for generating mock housing data.
    
    This service will be replaced with a database-backed service
    when the database is integrated.
    """

    REGIONS = [
        "San Francisco", "Los Angeles", "Seattle", "Austin", "Denver",
        "Phoenix", "Miami", "New York", "Boston", "Chicago",
    ]

    MACRO_INDICATORS = [
        ("30Y Mortgage Rate", 6.5, 7.5),
        ("Unemployment Rate", 3.5, 5.0),
        ("CPI YoY", 2.5, 4.0),
        ("GDP Growth", 1.5, 3.5),
        ("Housing Starts (K)", 1200, 1600),
        ("Consumer Confidence", 95, 115),
    ]

    def __init__(self) -> None:
        """Initialize with cached data for consistency across requests."""
        self._housing_metrics = self._generate_housing_metrics()
        self._macro_indicators = self._generate_macro_indicators()
        self._forecasts = self._generate_forecasts()

    def _generate_housing_metrics(self) -> list[dict]:
        """Generate dummy housing metrics data."""
        metrics = []
        base_date = datetime.now()

        for i, region in enumerate(self.REGIONS):
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

    def _generate_macro_indicators(self) -> list[dict]:
        """Generate dummy macro economic indicators."""
        data = []
        base_date = datetime.now()

        for name, low, high in self.MACRO_INDICATORS:
            for month_offset in range(12):
                date = base_date - timedelta(days=month_offset * 30)
                data.append({
                    "id": len(data) + 1,
                    "date": date.strftime("%Y-%m-%d"),
                    "indicatorName": name,
                    "value": round(random.uniform(low, high), 2),
                })

        return data

    def _generate_forecasts(self) -> list[dict]:
        """Generate dummy price forecasts."""
        forecasts = []
        forecast_regions = self.REGIONS[:5]
        metric_types = ["medianPrice", "inventory", "daysOnMarket"]
        base_date = datetime.now()

        for region in forecast_regions:
            for metric in metric_types:
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

    def get_housing_metrics(self) -> list[dict]:
        """Get all housing metrics."""
        return self._housing_metrics

    def get_macro_indicators(self) -> list[dict]:
        """Get all macro indicators."""
        return self._macro_indicators

    def get_forecasts(self) -> list[dict]:
        """Get all forecasts."""
        return self._forecasts

    def get_market_data(self, region: str) -> list[dict] | None:
        """Get metrics for a specific region."""
        metrics = [
            m for m in self._housing_metrics
            if m["region"].lower() == region.lower()
        ]
        return metrics if metrics else None

    def get_available_regions(self) -> list[str]:
        """Get list of available regions."""
        return list(set(m["region"] for m in self._housing_metrics))

    def get_dashboard_data(self) -> DashboardResponse:
        """Get complete dashboard summary data."""
        return DashboardResponse(
            healthScore=72,
            healthScoreTrend=3.2,
            priceGrowth=5.2,
            priceGrowthTrend=-1.8,
            inventoryLevel="Low",
            inventoryChange=12.5,
            mortgageRate=6.89,
            mortgageRateTrend=0.15,
            topMarkets=[
                MarketSummary(city="Austin", state="TX", growth=8.3, risk="Medium", medianPrice=542000, inventory=2450, daysOnMarket=28),
                MarketSummary(city="Phoenix", state="AZ", growth=6.1, risk="Low", medianPrice=438000, inventory=4200, daysOnMarket=35),
                MarketSummary(city="Tampa", state="FL", growth=7.8, risk="Medium", medianPrice=385000, inventory=3100, daysOnMarket=32),
                MarketSummary(city="Nashville", state="TN", growth=5.9, risk="Low", medianPrice=465000, inventory=2800, daysOnMarket=30),
                MarketSummary(city="Denver", state="CO", growth=4.2, risk="Low", medianPrice=595000, inventory=3500, daysOnMarket=38),
                MarketSummary(city="Miami", state="FL", growth=9.1, risk="High", medianPrice=625000, inventory=2100, daysOnMarket=25),
            ],
            macroIndicators=[
                MacroIndicatorSummary(name="Fed Funds Rate", value=5.25, unit="%", change=0, trend="stable"),
                MacroIndicatorSummary(name="CPI (Inflation)", value=3.2, unit="%", change=-0.3, trend="down"),
                MacroIndicatorSummary(name="Unemployment", value=3.9, unit="%", change=0.1, trend="up"),
                MacroIndicatorSummary(name="GDP Growth", value=2.8, unit="%", change=0.4, trend="up"),
                MacroIndicatorSummary(name="10Y Treasury", value=4.35, unit="%", change=-0.12, trend="down"),
                MacroIndicatorSummary(name="Consumer Confidence", value=102.5, unit="", change=3.2, trend="up"),
            ],
            alerts=[
                Alert(id="1", type="warning", title="Overvaluation Signal", message="Austin market showing overvaluation signals. Price-to-income ratio exceeds historical average by 18%.", timestamp="2 hours ago", region="Austin, TX"),
                Alert(id="2", type="info", title="Rate Sensitivity Alert", message="Miami market highly sensitive to rate changes. A 0.5% rate increase could reduce affordability by 8%.", timestamp="5 hours ago", region="Miami, FL"),
                Alert(id="3", type="success", title="Market Recovery", message="Phoenix inventory levels normalizing. Days on market decreased 12% month-over-month.", timestamp="1 day ago", region="Phoenix, AZ"),
                Alert(id="4", type="danger", title="Price Correction Risk", message="Boise showing early signs of price correction. Year-over-year growth turned negative.", timestamp="1 day ago", region="Boise, ID"),
            ],
            priceTrends=[
                PriceTrend(month="Jan", national=385000),
                PriceTrend(month="Feb", national=388000),
                PriceTrend(month="Mar", national=392000),
                PriceTrend(month="Apr", national=398000),
                PriceTrend(month="May", national=405000),
                PriceTrend(month="Jun", national=412000),
                PriceTrend(month="Jul", national=418000),
                PriceTrend(month="Aug", national=422000),
                PriceTrend(month="Sep", national=425000),
                PriceTrend(month="Oct", national=428000),
                PriceTrend(month="Nov", national=430000),
                PriceTrend(month="Dec", national=432000),
                PriceTrend(month="Jan*", national=432000, forecast=435000),
                PriceTrend(month="Feb*", national=432000, forecast=438000),
                PriceTrend(month="Mar*", national=432000, forecast=442000),
            ],
        )


@lru_cache
def get_mock_data_service() -> MockDataService:
    """Get cached mock data service instance."""
    return MockDataService()


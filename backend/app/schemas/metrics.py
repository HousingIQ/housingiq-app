"""Schemas for housing metrics, macro indicators, and forecasts."""

from pydantic import BaseModel


class HousingMetric(BaseModel):
    """Housing market metric for a specific region and date."""

    id: int
    date: str
    region: str
    medianPrice: float
    yoyChange: float
    inventory: int
    daysOnMarket: int


class MacroIndicator(BaseModel):
    """Macroeconomic indicator data point."""

    id: int
    date: str
    indicatorName: str
    value: float


class Forecast(BaseModel):
    """Price forecast with confidence interval."""

    id: int
    forecastDate: str
    targetDate: str
    metric: str
    predictedValue: float
    confidenceLower: float
    confidenceUpper: float


"""Schemas for dashboard summary data."""

from typing import Literal

from pydantic import BaseModel


class MarketSummary(BaseModel):
    """Summary data for a housing market."""

    city: str
    state: str
    growth: float
    risk: Literal["Low", "Medium", "High"]
    medianPrice: int
    inventory: int
    daysOnMarket: int


class MacroIndicatorSummary(BaseModel):
    """Summary of a macroeconomic indicator."""

    name: str
    value: float
    unit: str
    change: float
    trend: Literal["up", "down", "stable"]


class Alert(BaseModel):
    """Market alert notification."""

    id: str
    type: Literal["info", "warning", "success", "danger"]
    title: str
    message: str
    timestamp: str
    region: str


class PriceTrend(BaseModel):
    """Monthly price trend data point."""

    month: str
    national: int
    forecast: int | None = None


class DashboardResponse(BaseModel):
    """Complete dashboard summary response."""

    healthScore: float
    healthScoreTrend: float
    priceGrowth: float
    priceGrowthTrend: float
    inventoryLevel: str
    inventoryChange: float
    mortgageRate: float
    mortgageRateTrend: float
    topMarkets: list[MarketSummary]
    macroIndicators: list[MacroIndicatorSummary]
    alerts: list[Alert]
    priceTrends: list[PriceTrend]


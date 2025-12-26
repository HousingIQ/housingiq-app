"""Housing metrics and macro indicators endpoints."""

from fastapi import APIRouter

from app.api.deps import MockDataDep
from app.schemas.metrics import Forecast, HousingMetric, MacroIndicator

router = APIRouter()


@router.get("/metrics", response_model=list[HousingMetric])
async def get_housing_metrics(service: MockDataDep) -> list[dict]:
    """Get housing metrics data.
    
    Returns historical housing metrics across all tracked regions.
    Used by: useHousingMetrics() hook in frontend.
    """
    return service.get_housing_metrics()


@router.get("/macro", response_model=list[MacroIndicator])
async def get_macro_indicators(service: MockDataDep) -> list[dict]:
    """Get macroeconomic indicators.
    
    Returns historical macroeconomic data points.
    Used by: useMacroIndicators() hook in frontend.
    """
    return service.get_macro_indicators()


@router.get("/forecasts", response_model=list[Forecast])
async def get_forecasts(service: MockDataDep) -> list[dict]:
    """Get price forecasts.
    
    Returns price predictions with confidence intervals.
    Used by: useForecasts() hook in frontend.
    """
    return service.get_forecasts()


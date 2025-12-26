"""Market-specific endpoints."""

from fastapi import APIRouter, HTTPException

from app.api.deps import MockDataDep
from app.schemas.metrics import HousingMetric

router = APIRouter()


@router.get("/markets/{region}", response_model=list[HousingMetric])
async def get_market_data(region: str, service: MockDataDep) -> list[dict]:
    """Get detailed market data for a specific region.
    
    Args:
        region: The region name to get data for (case-insensitive).
        
    Returns:
        Historical housing metrics for the specified region.
        
    Raises:
        HTTPException: 404 if region is not found.
    """
    metrics = service.get_market_data(region)
    
    if metrics is None:
        available = service.get_available_regions()
        raise HTTPException(
            status_code=404,
            detail={
                "error": f"Region '{region}' not found",
                "available_regions": available,
            },
        )
    
    return metrics


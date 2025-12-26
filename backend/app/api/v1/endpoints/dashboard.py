"""Dashboard summary endpoints."""

from fastapi import APIRouter

from app.api.deps import MockDataDep
from app.schemas.dashboard import DashboardResponse

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_summary(service: MockDataDep) -> DashboardResponse:
    """Get dashboard summary data.
    
    Returns aggregated data for the main dashboard view including:
    - Health score and trends
    - Top performing markets
    - Macro indicators summary
    - Active alerts
    - Price trend charts
    """
    return service.get_dashboard_data()


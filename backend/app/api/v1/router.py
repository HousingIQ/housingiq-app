"""API v1 router combining all endpoints."""

from fastapi import APIRouter

from app.api.v1.endpoints import dashboard, health, markets, metrics

router = APIRouter()

# Include all endpoint routers
router.include_router(health.router, tags=["health"])
router.include_router(metrics.router, tags=["metrics"])
router.include_router(dashboard.router, tags=["dashboard"])
router.include_router(markets.router, tags=["markets"])


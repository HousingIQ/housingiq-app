"""FastAPI application initialization and configuration."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_v1_router
from app.config import get_settings

settings = get_settings()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title=settings.app_name,
        description="Housing Analytics Backend API",
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routers
    application.include_router(api_v1_router, prefix=settings.api_v1_prefix)

    # Root endpoint
    @application.get("/")
    async def root() -> dict:
        """Root endpoint with API info."""
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "status": "running",
            "docs": "/docs",
            "endpoints": {
                "health": f"{settings.api_v1_prefix}/health",
                "metrics": f"{settings.api_v1_prefix}/metrics",
                "macro": f"{settings.api_v1_prefix}/macro",
                "forecasts": f"{settings.api_v1_prefix}/forecasts",
                "dashboard": f"{settings.api_v1_prefix}/dashboard",
                "market": f"{settings.api_v1_prefix}/markets/{{region}}",
            },
        }

    return application


# Create the app instance
app = create_app()


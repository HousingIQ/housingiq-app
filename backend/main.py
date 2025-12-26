"""Entry point for Vercel Functions.

This module imports and exposes the FastAPI app for Vercel deployment.
For local development, use: uvicorn app.main:app --reload
"""

from app.main import app

# Re-export for Vercel to find
__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


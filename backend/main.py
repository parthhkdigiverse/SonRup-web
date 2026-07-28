"""
SonRup FastAPI Application — Main Entry Point.
All configuration loaded from root .env file.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from starlette.routing import Mount
from starlette.types import ASGIApp

from config import PORT, HOST, DEBUG
from database import connect_db, close_db
from seed_data import seed_products

# Import routers
from routers.config import router as config_router
from routers.auth import router as auth_router
from routers.products import router as products_router
from routers.orders import router as orders_router
from routers.contact import router as contact_router


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: connect DB on startup, close on shutdown."""
    db = await connect_db()
    await seed_products(db)
    yield
    await close_db()


# ─── API sub-application ───
api_app = FastAPI(
    title="SonRup API",
    description="Backend API for SonRup Premium Wellness E-Commerce",
    version="1.0.0",
)

api_app.include_router(config_router)
api_app.include_router(auth_router)
api_app.include_router(products_router)
api_app.include_router(orders_router)
api_app.include_router(contact_router)


# ─── Main application ───
app = FastAPI(lifespan=lifespan)

# Mount the API sub-app at /api — this takes full priority for /api/* paths
app.mount("/api", api_app)

# Mount static frontend at / — serves everything else
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
    )

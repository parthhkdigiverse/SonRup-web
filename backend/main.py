"""
SonRup FastAPI Application — Main Entry Point.
All configuration and dynamic ports loaded from root .env file.
"""

from contextlib import asynccontextmanager
from pathlib import Path
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

from config import BACKEND_PORT, HOST, DEBUG, FRONTEND_CONFIG
from database import connect_db, close_db
from seed_data import seed_products, seed_admin, seed_settings, seed_coupons

# Import routers
from routers.config import router as config_router
from routers.auth import router as auth_router
from routers.products import router as products_router
from routers.orders import router as orders_router
from routers.contact import router as contact_router
from routers.admin import router as admin_router


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: connect DB, seed data, and generate static frontend config on startup."""
    db = await connect_db()
    await seed_products(db)
    await seed_admin(db)
    await seed_settings(db)
    await seed_coupons(db)
    
    # Dump FRONTEND_CONFIG to frontend/config.json so standalone frontend servers on FRONTEND_PORT can access dynamic ports
    try:
        config_path = FRONTEND_DIR / "config.json"
        config_path.write_text(json.dumps(FRONTEND_CONFIG, indent=2), encoding="utf-8")
        print(f"📦 Exported dynamic frontend port config to {config_path.name}")
    except Exception as e:
        print(f"⚠️ Could not export config.json: {e}")

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
api_app.include_router(admin_router)


# ─── Main application ───
app = FastAPI(lifespan=lifespan)

# Allow all origins silently without requiring any CORS config or domain lists in .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the API sub-app at /api — this takes full priority for /api/* paths
app.mount("/api", api_app)

# Mount static frontend at / — serves everything else
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=HOST,
        port=BACKEND_PORT,
        reload=DEBUG,
    )

"""
Config router — serves public frontend configuration from .env.
Only exposes safe, non-secret values.
"""

from fastapi import APIRouter
from config import FRONTEND_CONFIG

router = APIRouter(prefix="/config", tags=["Config"])


@router.get("")
async def get_frontend_config():
    """Return public frontend configuration values from .env."""
    return FRONTEND_CONFIG

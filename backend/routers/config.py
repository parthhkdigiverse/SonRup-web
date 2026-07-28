"""
Config router — serves public frontend configuration from .env.
Only exposes safe, non-secret values.
"""

from fastapi import APIRouter
from config import FRONTEND_CONFIG
from database import get_db

router = APIRouter(prefix="/config", tags=["Config"])


@router.get("")
async def get_frontend_config():
    """Return public frontend configuration values from MongoDB settings merged with port definitions."""
    db = get_db()
    merged_config = dict(FRONTEND_CONFIG)
    if db is not None:
        try:
            settings = await db.settings.find_one({"_id": "global_settings"})
            if settings:
                for k, v in settings.items():
                    if k != "_id":
                        merged_config[k] = v
        except Exception as e:
            pass
    return merged_config

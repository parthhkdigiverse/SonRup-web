from fastapi import APIRouter
from config import FRONTEND_CONFIG
from routers.admin import get_website_settings

router = APIRouter(prefix="/config", tags=["Config"])


@router.get("")
async def get_frontend_config():
    """Return public frontend configuration values from MongoDB settings merged with port definitions."""
    merged_config = dict(FRONTEND_CONFIG)
    try:
        settings = await get_website_settings()
        if settings:
            for k, v in settings.items():
                if k != "_id":
                    merged_config[k] = v
    except Exception as e:
        pass
    return merged_config

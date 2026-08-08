"""
Configuration module — loads ALL settings from the root .env file.
Both backend and frontend ports are fully dynamic and changeable without fixed domains.
"""

from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env from project root (one level up from backend/)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


def get_env_var(key: str, default: str = "") -> str:
    """Get environment variable and expand any variable references (e.g., ${MONGO_PORT})."""
    val = os.getenv(key, default)
    return os.path.expandvars(val)


# ─── Dynamic Port & API Configuration ───
BACKEND_URL: str = get_env_var("BACKEND_URL", "")
BACKEND_PORT: int = int(get_env_var("BACKEND_PORT", get_env_var("PORT", "8010")))
PORT: int = BACKEND_PORT  # Backward compatibility alias
FRONTEND_PORT: int = int(get_env_var("FRONTEND_PORT", "3000"))

# ─── Server & Database configuration ───
HOST: str = get_env_var("HOST", "0.0.0.0")
MONGO_HOST: str = get_env_var("MONGO_HOST", "localhost")
MONGO_PORT: str = get_env_var("MONGO_PORT", "27017")
MONGO_URL: str = get_env_var("MONGO_URL", f"mongodb://{MONGO_HOST}:{MONGO_PORT}")
DB_NAME: str = get_env_var("DB_NAME", "sonrup")

SECRET_KEY: str = get_env_var("SECRET_KEY", "")
JWT_ALGORITHM: str = get_env_var("JWT_ALGORITHM", "HS256")
TOKEN_EXPIRE_MINUTES: int = int(get_env_var("TOKEN_EXPIRE_MINUTES", "5256000"))
DEBUG: bool = get_env_var("DEBUG", "false").lower() == "true"

# ─── Default Admin Account Credentials ───
ADMIN_EMAIL: str = get_env_var("ADMIN_EMAIL", "admin@sonrup.com")
ADMIN_PASSWORD: str = get_env_var("ADMIN_PASSWORD", "AdminSonRup2026!")

# ─── Public frontend config (safe to expose via /api/config or config.json) ───
FRONTEND_CONFIG: dict = {
    "backend_url": BACKEND_URL,
    "backend_port": BACKEND_PORT,
    "frontend_port": FRONTEND_PORT,
    "site_name": get_env_var("SITE_NAME", "Sonrup"),
    "support_email": get_env_var("SUPPORT_EMAIL", "info@sonrup.com"),
    "support_phone": get_env_var("SUPPORT_PHONE", "+91 76001 75193"),
    "support_address": get_env_var("SUPPORT_ADDRESS", ""),
    "fssai_number": get_env_var("FSSAI_NUMBER", ""),
    "license_number": get_env_var("LICENSE_NUMBER", ""),
}

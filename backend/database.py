"""
MongoDB connection via Motor (async driver).
All connection details read from config (which reads from .env).
"""

import motor.motor_asyncio
from config import MONGO_URL, DB_NAME

client: motor.motor_asyncio.AsyncIOMotorClient = None
db = None


async def connect_db():
    """Connect to MongoDB on application startup."""
    global client, db
    client = motor.motor_asyncio.AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )
    db = client[DB_NAME]

    # Test connection
    try:
        await client.admin.command("ping")
        print(f"✅ Connected to MongoDB: {DB_NAME}")
    except Exception as e:
        print(f"⚠️  MongoDB connection warning: {e}")
        print("   Server will start but database operations may fail.")
        print(f"   Make sure MongoDB is running at: {MONGO_URL}")
        return db

    # Create unique indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.products.create_index("slug", unique=True)
    except Exception as e:
        print(f"⚠️  Index creation warning: {e}")

    return db


async def close_db():
    """Close MongoDB connection on application shutdown."""
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed.")


def get_db():
    """Get the database instance."""
    return db

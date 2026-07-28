"""
Admin router — complete full-stack website data, product catalog, and global order management.
Protected by get_current_admin_user dependency.
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from bson import ObjectId
from pathlib import Path
import shutil
import os
import uuid

from database import get_db
from auth_utils import get_current_admin_user
from schemas.product import ProductOut, ProductVariant

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"], dependencies=[Depends(get_current_admin_user)])

FRONTEND_IMAGES_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "assets" / "images"
FRONTEND_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# ─── Schemas for Admin Operations ───
class WebsiteSettingsIn(BaseModel):
    site_name: str
    support_email: str
    support_phone: str
    support_address: str
    fssai_number: str
    license_number: str
    announcement_banner_enabled: bool = True
    announcement_banner_text: str = ""

class ProductIn(BaseModel):
    slug: str
    name: str
    tag: str
    flavor: str
    price: int
    description: str
    benefits: List[str]
    images: List[str]
    tag_class: str = "tag-default"
    product_type: str = "single"
    variants: Optional[List[ProductVariant]] = []

class ProductUpdateIn(BaseModel):
    name: Optional[str] = None
    tag: Optional[str] = None
    flavor: Optional[str] = None
    price: Optional[int] = None
    description: Optional[str] = None
    benefits: Optional[List[str]] = None
    images: Optional[List[str]] = None
    tag_class: Optional[str] = None
    product_type: Optional[str] = None
    variants: Optional[List[ProductVariant]] = None

class OrderStatusUpdateIn(BaseModel):
    status: str

class UserRoleUpdateIn(BaseModel):
    is_admin: bool


def _clean_doc(doc: dict) -> dict:
    """Convert ObjectId fields to string for clean JSON response."""
    if not doc:
        return doc
    doc["_id"] = str(doc["_id"])
    return doc


# ─── 1. Dashboard Metrics & KPI Counters ───
@router.get("/stats")
async def get_dashboard_stats():
    """Retrieve platform-wide operational analytics and KPI numbers."""
    db = get_db()
    users_count = await db.users.count_documents({})
    products_count = await db.products.count_documents({})
    orders_count = await db.orders.count_documents({})
    
    # Calculate Total Revenue across all orders
    pipeline = [{"$group": {"_id": None, "total_revenue": {"$sum": "$total"}}}]
    cursor = db.orders.aggregate(pipeline)
    results = await cursor.to_list(1)
    total_revenue = results[0]["total_revenue"] if results else 0

    return {
        "revenue": total_revenue,
        "orders_count": orders_count,
        "products_count": products_count,
        "users_count": users_count,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ─── 2. Website Content & Settings Editor ───
@router.get("/settings")
async def get_website_settings():
    """Get dynamic general website settings from MongoDB."""
    db = get_db()
    settings = await db.settings.find_one({"_id": "global_settings"})
    if not settings:
        from config import FRONTEND_CONFIG
        settings = {
            "_id": "global_settings",
            "site_name": FRONTEND_CONFIG.get("site_name", "Sonrup"),
            "support_email": FRONTEND_CONFIG.get("support_email", "info@sonrup.com"),
            "support_phone": FRONTEND_CONFIG.get("support_phone", "+91 76001 75193"),
            "support_address": FRONTEND_CONFIG.get("support_address", "A 584 Sitaram Society, Punagam Road, Surat-395010"),
            "fssai_number": FRONTEND_CONFIG.get("fssai_number", "10726997000544"),
            "license_number": FRONTEND_CONFIG.get("license_number", "GA/646-A"),
            "announcement_banner_enabled": True,
            "announcement_banner_text": "🌟 Free Express Shipping on All Wellness Orders Above ₹999 across India! 🚀",
        }
    return settings


@router.put("/settings")
async def update_website_settings(data: WebsiteSettingsIn):
    """Update dynamic website settings in MongoDB."""
    db = get_db()
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc)
    await db.settings.update_one(
        {"_id": "global_settings"},
        {"$set": update_doc},
        upsert=True
    )
    update_doc["_id"] = "global_settings"
    return {"message": "Website settings successfully updated", "settings": update_doc}


# ─── 3. Product Catalog CRUD & Image Upload ───
@router.post("/upload-image")
async def upload_product_image(file: UploadFile = File(...)):
    """Upload a product picture and store it directly in local frontend/assets/images directory."""
    ext = Path(file.filename or "image.jpg").suffix
    filename = f"prod_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = FRONTEND_IMAGES_DIR / filename
    
    with dest_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"image_path": f"assets/images/{filename}", "message": "Image uploaded successfully"}


@router.post("/products", status_code=status.HTTP_201_CREATED)
async def create_product(data: ProductIn):
    """Create and publish a new item into the active website product catalog."""
    db = get_db()
    existing = await db.products.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product slug '{data.slug}' already exists.")
    
    prod_doc = data.model_dump()
    prod_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.products.insert_one(prod_doc)
    prod_doc["_id"] = str(result.inserted_id)
    return prod_doc


@router.put("/products/{slug}")
async def update_product(slug: str, data: ProductUpdateIn):
    """Modify an existing product in the catalog."""
    db = get_db()
    existing = await db.products.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
        
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_fields:
        return _clean_doc(existing)
        
    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.products.update_one({"slug": slug}, {"$set": update_fields})
    updated = await db.products.find_one({"slug": slug})
    return _clean_doc(updated)


@router.delete("/products/{slug}")
async def delete_product(slug: str):
    """Remove a product from the database."""
    db = get_db()
    result = await db.products.delete_one({"slug": slug})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return {"message": f"Product '{slug}' permanently removed from catalog."}


# ─── 4. Global Orders Overwatch ───
@router.get("/orders")
async def list_all_orders():
    """Retrieve all orders placed across the entire platform, newest first."""
    db = get_db()
    orders = await db.orders.find({}).sort("created_at", -1).to_list(1000)
    return [_clean_doc(o) for o in orders]


@router.put("/orders/{order_ref}/status")
async def update_order_status(order_ref: str, data: OrderStatusUpdateIn):
    """Update order shipping status (e.g. Processing -> Shipped -> Delivered)."""
    db = get_db()
    # Search by order_id string (e.g. SR123456) or _id ObjectId
    query = {"order_id": order_ref}
    if ObjectId.is_valid(order_ref):
        query = {"$or": [{"order_id": order_ref}, {"_id": ObjectId(order_ref)}]}
        
    result = await db.orders.update_one(query, {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return {"message": f"Order {order_ref} status updated to {data.status}."}


# ─── 5. Registered Users Overwatch ───
@router.get("/users")
async def list_all_users():
    """List all registered customers (excluding password hashes)."""
    db = get_db()
    users = await db.users.find({}, {"hashed_password": 0}).sort("created_at", -1).to_list(1000)
    return [_clean_doc(u) for u in users]


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: UserRoleUpdateIn):
    """Elevate or revoke administrator privileges for a registered account."""
    db = get_db()
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format.")
        
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_admin": data.is_admin}})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return {"message": f"User {user_id} admin role set to {data.is_admin}."}

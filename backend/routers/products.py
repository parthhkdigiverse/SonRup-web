"""
Products router — list and retrieve products from MongoDB.
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import Optional, List

from database import get_db
from schemas.product import ProductOut

router = APIRouter(prefix="/products", tags=["Products"])


def _product_to_out(product: dict) -> ProductOut:
    """Convert a MongoDB product document to a ProductOut schema."""
    return ProductOut(
        id=str(product["_id"]),
        slug=product["slug"],
        name=product["name"],
        tag=product["tag"],
        flavor=product["flavor"],
        price=product["price"],
        description=product["description"],
        benefits=product["benefits"],
        images=product["images"],
        tag_class=product["tag_class"],
        product_type=product["product_type"],
    )


@router.get("", response_model=List[ProductOut])
async def list_products(type: Optional[str] = Query(None, description="Filter by 'single' or 'combo'")):
    """List all products, optionally filtered by type."""
    db = get_db()
    query = {}
    if type and type in ("single", "combo"):
        query["product_type"] = type

    products = await db.products.find(query).to_list(100)
    return [_product_to_out(p) for p in products]


@router.get("/{slug}", response_model=ProductOut)
async def get_product(slug: str):
    """Get a single product by its slug."""
    db = get_db()
    product = await db.products.find_one({"slug": slug})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{slug}' not found.",
        )
    return _product_to_out(product)

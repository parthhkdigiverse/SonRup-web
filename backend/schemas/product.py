from pydantic import BaseModel
from typing import List, Optional


class ProductVariant(BaseModel):
    """Schema for product size, pack, or flavor variants."""
    name: str
    price: int
    sku: Optional[str] = ""
    in_stock: bool = True

class IngredientRow(BaseModel):
    component: str
    feature: str
    amount: str

class ProductOut(BaseModel):
    """Schema for product response."""
    id: str
    slug: str
    name: str
    tag: str
    flavor: str
    price: int
    description: str
    benefits: List[str]
    images: List[str]
    tag_class: str
    product_type: str  # "single" or "combo"
    variants: Optional[List[ProductVariant]] = []
    suggested_usage: Optional[str] = ""
    ingredients: Optional[List[IngredientRow]] = []

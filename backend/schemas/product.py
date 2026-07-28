"""Product schemas for response validation."""

from pydantic import BaseModel
from typing import List, Optional


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

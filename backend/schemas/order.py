"""Order schemas for request/response validation."""

from pydantic import BaseModel, EmailStr
from typing import List, Optional


class OrderItemIn(BaseModel):
    """Schema for a single item in an order."""
    name: str
    price: int
    img: str
    quantity: int


class ShippingInfo(BaseModel):
    """Schema for shipping details."""
    name: str
    address: str
    city: str
    pincode: str
    email: EmailStr
    phone: str


class OrderCreate(BaseModel):
    """Schema for creating a new order."""
    items: List[OrderItemIn]
    shipping: ShippingInfo
    payment_method: str  # "cod" or "upi"


class OrderOut(BaseModel):
    """Schema for order response."""
    id: str
    order_id: str
    items: List[dict]
    total: int
    status: str
    shipping: dict
    payment_method: str
    date: str

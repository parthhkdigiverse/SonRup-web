"""Contact form schemas for request validation."""

from pydantic import BaseModel, EmailStr
from typing import Optional


class ContactCreate(BaseModel):
    """Schema for contact form submission."""
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    subject: str
    message: str

"""User schemas for request/response validation."""

from pydantic import BaseModel, EmailStr
from typing import Optional


class UserSignup(BaseModel):
    """Schema for user registration."""
    name: str
    email: EmailStr
    password: str
    phone: str
    address: str
    pincode: str


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserProfile(BaseModel):
    """Schema for user profile response (no password)."""
    id: str
    name: str
    email: str
    phone: str
    address: str
    pincode: str
    is_admin: bool = False


class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

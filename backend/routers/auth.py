"""
Authentication router — signup, login, and profile endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from datetime import datetime, timezone

from database import get_db
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from schemas.user import UserSignup, UserLogin, UserProfile, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _user_to_profile(user: dict) -> UserProfile:
    """Convert a MongoDB user document to a UserProfile schema."""
    return UserProfile(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        phone=user["phone"],
        address=user["address"],
        pincode=user["pincode"],
        is_admin=bool(user.get("is_admin", False)),
    )


@router.post("/signup", response_model=TokenResponse)
async def signup(data: UserSignup):
    """Register a new user account."""
    db = get_db()

    # Check if email already exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    # Create user document
    user_doc = {
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "address": data.address,
        "pincode": data.pincode,
        "hashed_password": hash_password(data.password),
        "is_admin": False,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    # Generate JWT token
    token = create_access_token(str(result.inserted_id))
    profile = _user_to_profile(user_doc)

    return TokenResponse(access_token=token, user=profile)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Authenticate a user and return a JWT token."""
    db = get_db()

    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Generate JWT token
    token = create_access_token(str(user["_id"]))
    profile = _user_to_profile(user)

    return TokenResponse(access_token=token, user=profile)


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return _user_to_profile(current_user)

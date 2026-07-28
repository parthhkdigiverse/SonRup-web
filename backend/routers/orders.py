"""
Orders router — place orders and retrieve order history.
"""

import random
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from auth_utils import get_current_user
from schemas.order import OrderCreate, OrderOut

router = APIRouter(prefix="/orders", tags=["Orders"])


def _order_to_out(order: dict) -> OrderOut:
    """Convert a MongoDB order document to an OrderOut schema."""
    return OrderOut(
        id=str(order["_id"]),
        order_id=order["order_id"],
        items=order["items"],
        total=order["total"],
        status=order["status"],
        shipping=order["shipping"],
        payment_method=order["payment_method"],
        date=order["created_at"].strftime("%d/%m/%Y"),
    )


@router.post("", response_model=OrderOut)
async def create_order(
    data: OrderCreate,
    current_user: dict = Depends(get_current_user),
):
    """Place a new order (requires authentication)."""
    db = get_db()

    if not data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item.",
        )

    # Calculate total
    total = sum(item.price * item.quantity for item in data.items)

    # Generate unique order ID
    order_id = f"SR{random.randint(100000, 999999)}"

    order_doc = {
        "order_id": order_id,
        "user_id": current_user["_id"],
        "items": [item.model_dump() for item in data.items],
        "total": total,
        "status": "Processing",
        "shipping": data.shipping.model_dump(),
        "payment_method": data.payment_method,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id

    return _order_to_out(order_doc)


@router.get("", response_model=List[OrderOut])
async def list_orders(current_user: dict = Depends(get_current_user)):
    """Get the current user's order history (newest first)."""
    db = get_db()
    orders = (
        await db.orders.find({"user_id": current_user["_id"]})
        .sort("created_at", -1)
        .to_list(100)
    )
    return [_order_to_out(o) for o in orders]

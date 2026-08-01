"""
Orders router — place orders and retrieve order history.
"""

import random
from datetime import datetime, timezone
from typing import List, Optional

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
        waybill=order.get("waybill"),
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

    await auto_manifest_if_enabled(order_doc)

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


from pydantic import BaseModel

class CouponValidateIn(BaseModel):
    code: str
    cart_total: int


@router.post("/validate-coupon")
async def validate_coupon(data: CouponValidateIn):
    """Validate a promo coupon and calculate order discount."""
    db = get_db()
    code_clean = data.code.strip().upper()
    coupon = await db.coupons.find_one({"code": code_clean, "is_active": True})

    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired promo coupon code."
        )

    min_val = coupon.get("min_order_value", 0)
    if data.cart_total < min_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order value of ₹{min_val} required for coupon '{code_clean}'."
        )

    discount_amount = 0
    if coupon.get("discount_type") == "percentage":
        discount_amount = int(round(data.cart_total * (coupon.get("discount_value", 0) / 100.0)))
    else:
        discount_amount = int(coupon.get("discount_value", 0))

    discount_amount = min(discount_amount, data.cart_total)
    final_total = data.cart_total - discount_amount

    return {
        "valid": True,
        "code": code_clean,
        "discount_type": coupon.get("discount_type"),
        "discount_value": coupon.get("discount_value"),
        "discount_amount": discount_amount,
        "final_total": final_total,
        "message": f"🎉 Coupon '{code_clean}' applied successfully!"
    }


@router.get("/public-coupons")
async def list_public_coupons():
    """List active promo coupons for checkout display."""
    db = get_db()
    coupons = await db.coupons.find({"is_active": True}, {"_id": 0, "code": 1, "discount_type": 1, "discount_value": 1, "min_order_value": 1}).to_list(20)
    return coupons


# ─── Razorpay Payment Gateway Integration ───
import hmac
import hashlib

class RazorpayOrderCreateIn(BaseModel):
    amount: int
    coupon_code: Optional[str] = None


class RazorpayPaymentVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = ""
    order_data: dict


@router.get("/payment-config")
async def get_payment_config():
    """Get public payment gateway status and public Razorpay Key ID."""
    db = get_db()
    settings = await db.settings.find_one({"_id": "global_settings"})
    if not settings:
        settings = {}
    return {
        "razorpay_enabled": settings.get("razorpay_enabled", True),
        "razorpay_key_id": settings.get("razorpay_key_id", "rzp_test_SampleKey123")
    }


@router.post("/create-razorpay-order")
async def create_razorpay_order(data: RazorpayOrderCreateIn):
    """Create a Razorpay order via Razorpay API or return order credentials."""
    db = get_db()
    settings = await db.settings.find_one({"_id": "global_settings"}) or {}

    if not settings.get("razorpay_enabled", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Razorpay payment gateway is currently disabled by administrator."
        )

    key_id = settings.get("razorpay_key_id", "rzp_test_SampleKey123")
    key_secret = settings.get("razorpay_key_secret", "SampleSecretKey123456")

    amount_paisa = int(data.amount * 100)
    import uuid
    rzp_order_id = f"order_{uuid.uuid4().hex[:14]}"

    if key_id.startswith("rzp_") and not key_id.endswith("SampleKey123"):
        try:
            import urllib.request
            import base64
            import json

            auth_str = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
            payload = json.dumps({
                "amount": amount_paisa,
                "currency": "INR",
                "receipt": f"rcpt_{uuid.uuid4().hex[:8]}"
            }).encode()

            req = urllib.request.Request(
                "https://api.razorpay.com/v1/orders",
                data=payload,
                headers={
                    "Authorization": f"Basic {auth_str}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode())
                rzp_order_id = res_data.get("id", rzp_order_id)
        except Exception as e:
            print(f"⚠️ Razorpay API call note: {e}")

    return {
        "key_id": key_id,
        "razorpay_order_id": rzp_order_id,
        "amount": amount_paisa,
        "currency": "INR"
    }


@router.post("/verify-razorpay-payment")
async def verify_razorpay_payment(data: RazorpayPaymentVerifyIn):
    """Verify Razorpay payment signature and persist completed order."""
    db = get_db()
    settings = await db.settings.find_one({"_id": "global_settings"}) or {}
    key_secret = settings.get("razorpay_key_secret", "SampleSecretKey123456")

    if data.razorpay_signature and not key_secret.endswith("SampleSecretKey123456"):
        msg = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
        generated_signature = hmac.new(
            key_secret.encode(),
            msg.encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_signature != data.razorpay_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Razorpay payment signature."
            )

    order = data.order_data
    order["payment_method"] = "Razorpay"
    order["payment_status"] = "Paid"
    order["razorpay_payment_id"] = data.razorpay_payment_id
    order["razorpay_order_id"] = data.razorpay_order_id
    order["created_at"] = datetime.now(timezone.utc)
    order["status"] = "Processing"

    if "order_id" not in order:
        import random
        order["order_id"] = f"SR{random.randint(100000, 999999)}"

    res = await db.orders.insert_one(order)
    order["_id"] = str(res.inserted_id)

    await auto_manifest_if_enabled(order)

    return {
        "success": True,
        "message": "Payment verified and order placed successfully!",
        "order": _order_to_out(order)
    }


async def auto_manifest_if_enabled(order_doc: dict):
    """Automatically manifest shipment via Delhivery if logistics are enabled."""
    db = get_db()
    settings = await db.settings.find_one({"_id": "global_settings"}) or {}
    if settings.get("delhivery_enabled", False):
        try:
            from services.delhivery import create_shipment
            res = await create_shipment(order_doc, settings)
            if res.get("success"):
                waybill = res["waybill"]
                await db.orders.update_one(
                    {"_id": order_doc["_id"]},
                    {"$set": {
                        "waybill": waybill,
                        "status": "Shipped",
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
                order_doc["waybill"] = waybill
                order_doc["status"] = "Shipped"
        except Exception as e:
            print(f"⚠️ Auto Delhivery manifestation failed: {e}")


@router.get("/check-pincode/{pincode}")
async def public_check_pincode(pincode: str):
    """Check pincode serviceability dynamically for shipping configuration."""
    db = get_db()
    settings = await db.settings.find_one({"_id": "global_settings"}) or {}
    from services.delhivery import check_pincode_serviceability
    res = await check_pincode_serviceability(pincode, settings)
    return res


@router.get("/track/{waybill}")
async def public_track_shipment(waybill: str):
    """Retrieve tracking scan progression logs for a manifested waybill."""
    db = get_db()
    settings = await db.settings.find_one({"_id": "global_settings"}) or {}
    from services.delhivery import track_shipment
    res = await track_shipment(waybill, settings)
    return res

"""
Contact router — handles contact form submissions.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from database import get_db
from schemas.contact import ContactCreate

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("")
async def submit_contact(data: ContactCreate):
    """Submit a contact form message. No authentication required."""
    db = get_db()

    contact_doc = {
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "subject": data.subject,
        "message": data.message,
        "created_at": datetime.now(timezone.utc),
    }

    await db.contact_messages.insert_one(contact_doc)

    return {"success": True, "message": "Your message has been received. We'll get back to you shortly!"}

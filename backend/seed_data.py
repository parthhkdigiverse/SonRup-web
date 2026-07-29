"""
Seed data for the products collection.
All image paths reference local files in frontend/assets/images/.
"""

from datetime import datetime, timezone


SEED_PRODUCTS = [
    # ─── Single Products ───
    {
        "slug": "shilajit",
        "name": "Himalayan Shilajit Gummies",
        "tag": "Adult Performance",
        "flavor": "Imli (Tamarind) Flavour",
        "price": 999,
        "description": "Formulated for adult energy, strength, and stamina. Packed with purified shilajit resin containing 75% Fulvic Acid and Ashwagandha to elevate your daily performance naturally.",
        "benefits": [
            "Boosts Daily Energy & Stamina",
            "Premium Ashwagandha for Strength",
            "Traditional Ayurvedic Restorative",
            "100% Sugar-Free & Tamarind Sweetened",
        ],
        "images": [
            "assets/images/shilajit-bottle.jpg",
            "assets/images/shilajit-detail1.jpg",
            "assets/images/shilajit-detail2.jpg",
            "assets/images/shilajit-detail3.jpg",
        ],
        "tag_class": "tag-shilajit",
        "product_type": "single",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "slug": "biotin",
        "name": "Biotin + Multivitamin Gummies",
        "tag": "Adult Daily Wellness",
        "flavor": "Orange (Citrus) Flavour",
        "price": 999,
        "description": "Your daily beauty and vitality shield. Enriched with 10 essential vitamins and minerals, including high-potency Biotin, Zinc, and Vitamin C to support healthy skin, hair, and nails.",
        "benefits": [
            "Glow & Beauty (Hair, Skin & Nails)",
            "Essential Daily Vitality & Immunity",
            "10 Vitamins & Minerals incl. Folic Acid",
            "Delicious Sugar-Free Orange Citrus Chew",
        ],
        "images": [
            "assets/images/biotin-bottle.jpg",
            "assets/images/biotin-detail1.jpg",
            "assets/images/biotin-detail2.jpg",
            "assets/images/biotin-detail3.jpg",
        ],
        "tag_class": "tag-biotin",
        "product_type": "single",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "slug": "kids",
        "name": "Kid's Multivitamin & Immunity Booster",
        "tag": "Kids' Nutrition",
        "flavor": "Mixed Fruit Flavour",
        "price": 999,
        "description": "Daily nutrition support for active, growing kids. Packed with 13 crucial nutrients, including Iron, Zinc, Choline, and Inositol for natural brain and immune system growth.",
        "benefits": [
            "Strengthens Kids' Natural Immunity",
            "Healthy Growth, Bone & Brain Support",
            "13 Nutrients with Iron & Choline",
            "Kid-Approved Sugar-Free Mix Fruit taste",
        ],
        "images": [
            "assets/images/kids-bottle.jpg",
            "assets/images/kids-detail1.jpg",
            "assets/images/kids-detail2.jpg",
            "assets/images/kids-detail3.jpg",
        ],
        "tag_class": "tag-kids",
        "product_type": "single",
        "created_at": datetime.now(timezone.utc),
    },
    # ─── Combo Products ───
    {
        "slug": "family-combo",
        "name": "Sonrup Family Wellness Combo (3 Bottles)",
        "tag": "Best Value",
        "flavor": "Mixed Flavours",
        "price": 1799,
        "description": "The complete family wellness bundle — includes Shilajit, Biotin, and Kids Multivitamin gummies. Save ₹1,198 compared to buying individually.",
        "benefits": [
            "1x Himalayan Shilajit Gummies (Adult Performance)",
            "1x Biotin + Multivitamin Gummies (Adult Daily)",
            "1x Kid's Multivitamin & Immunity Booster",
            "Save ₹1,198 vs buying separately",
        ],
        "images": [
            "assets/images/hero-combo.jpg",
            "assets/images/shilajit-bottle.jpg",
            "assets/images/biotin-bottle.jpg",
            "assets/images/kids-bottle.jpg",
        ],
        "tag_class": "tag-combo",
        "product_type": "combo",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "slug": "adult-duo",
        "name": "Adult Power Duo (2 Bottles)",
        "tag": "Adults Pack",
        "flavor": "Tamarind + Orange",
        "price": 1499,
        "description": "The performance + beauty duo for adults. Includes Shilajit for strength and Biotin for daily vitality and glow.",
        "benefits": [
            "1x Himalayan Shilajit Gummies",
            "1x Biotin + Multivitamin Gummies",
            "Complete adult daily wellness",
            "Save ₹499 vs buying separately",
        ],
        "images": [
            "assets/images/shilajit-bottle.jpg",
            "assets/images/biotin-bottle.jpg",
            "assets/images/shilajit-detail1.jpg",
            "assets/images/biotin-detail1.jpg",
        ],
        "tag_class": "tag-combo",
        "product_type": "combo",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "slug": "mom-kid",
        "name": "Mom & Kid Combo (2 Bottles)",
        "tag": "Mom & Child",
        "flavor": "Orange + Mixed Fruit",
        "price": 1499,
        "description": "Designed for Mom and child wellness. Biotin for mom's beauty and energy, Kids multivitamin for growing immunity and brain health.",
        "benefits": [
            "1x Biotin + Multivitamin Gummies (for Mom)",
            "1x Kid's Multivitamin & Immunity Booster",
            "Mom beauty + child immunity combo",
            "Save ₹499 vs buying separately",
        ],
        "images": [
            "assets/images/biotin-bottle.jpg",
            "assets/images/kids-bottle.jpg",
            "assets/images/biotin-detail1.jpg",
            "assets/images/kids-detail1.jpg",
        ],
        "tag_class": "tag-combo",
        "product_type": "combo",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "slug": "dad-kid",
        "name": "Dad & Kid Combo (2 Bottles)",
        "tag": "Dad & Child",
        "flavor": "Tamarind + Mixed Fruit",
        "price": 1499,
        "description": "Strength for Dad, immunity for Kid. Shilajit for dad's energy and stamina, Kids multivitamin for growing bones and brain.",
        "benefits": [
            "1x Himalayan Shilajit Gummies (for Dad)",
            "1x Kid's Multivitamin & Immunity Booster",
            "Dad performance + child immunity combo",
            "Save ₹499 vs buying separately",
        ],
        "images": [
            "assets/images/shilajit-bottle.jpg",
            "assets/images/kids-bottle.jpg",
            "assets/images/shilajit-detail1.jpg",
            "assets/images/kids-detail1.jpg",
        ],
        "tag_class": "tag-combo",
        "product_type": "combo",
        "created_at": datetime.now(timezone.utc),
    },
]


async def seed_products(db):
    """Seed the products collection if it's empty."""
    count = await db.products.count_documents({})
    if count > 0:
        print(f"📦 Products collection already has {count} items. Skipping seed.")
        return

    result = await db.products.insert_many(SEED_PRODUCTS)
    print(f"🌱 Seeded {len(result.inserted_ids)} products into the database.")


async def seed_admin(db):
    """Seed default Admin user account if not already present."""
    from config import ADMIN_EMAIL, ADMIN_PASSWORD
    from auth_utils import hash_password

    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if not admin:
        admin_doc = {
            "name": "SonRup Administrator",
            "email": ADMIN_EMAIL,
            "phone": "+91 76001 75193",
            "address": "SonRup Headquarters, Surat",
            "pincode": "395010",
            "hashed_password": hash_password(ADMIN_PASSWORD),
            "is_admin": True,
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(admin_doc)
        print(f"🛡️ Seeded default Admin user: {ADMIN_EMAIL}")
    elif not admin.get("is_admin"):
        await db.users.update_one({"_id": admin["_id"]}, {"$set": {"is_admin": True}})
        print(f"🛡️ Upgraded existing account {ADMIN_EMAIL} to Administrator privileges.")


async def seed_settings(db):
    """Seed initial website settings document if collection is empty."""
    from config import FRONTEND_CONFIG

    settings = await db.settings.find_one({"_id": "global_settings"})
    if not settings:
        default_doc = {
            "_id": "global_settings",
            "site_name": FRONTEND_CONFIG.get("site_name", "Sonrup"),
            "support_email": FRONTEND_CONFIG.get("support_email", "info@sonrup.com"),
            "support_phone": FRONTEND_CONFIG.get("support_phone", "+91 76001 75193"),
            "support_address": FRONTEND_CONFIG.get("support_address", "A 584 Sitaram Society, Punagam Road, Surat-395010"),
            "fssai_number": FRONTEND_CONFIG.get("fssai_number", "10726997000544"),
            "license_number": FRONTEND_CONFIG.get("license_number", "GA/646-A"),
            "announcement_banner_enabled": True,
            "announcement_banner_text": "🌟 Free Express Shipping on All Wellness Orders Above ₹999 across India! 🚀",
            "razorpay_enabled": True,
            "razorpay_key_id": "rzp_test_SampleKey123",
            "razorpay_key_secret": "SampleSecretKey123456",
            "updated_at": datetime.now(timezone.utc),
        }
        await db.settings.insert_one(default_doc)
        print("⚙️ Seeded default website settings into MongoDB.")


async def seed_coupons(db):
    """Seed initial promo coupons if collection is empty."""
    count = await db.coupons.count_documents({})
    if count == 0:
        seed_list = [
            {
                "code": "SONRUP20",
                "discount_type": "percentage",
                "discount_value": 20,
                "min_order_value": 999,
                "is_active": True,
                "usage_count": 5,
                "created_at": datetime.now(timezone.utc),
            },
            {
                "code": "WELCOME100",
                "discount_type": "fixed",
                "discount_value": 100,
                "min_order_value": 500,
                "is_active": True,
                "usage_count": 12,
                "created_at": datetime.now(timezone.utc),
            }
        ]
        await db.coupons.insert_many(seed_list)
        print("🎟️ Seeded default promo coupons into MongoDB.")


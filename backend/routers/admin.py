"""
Admin router — complete full-stack website data, product catalog, and global order management.
Protected by get_current_admin_user dependency.
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from bson import ObjectId
from pathlib import Path
import shutil
import os
import uuid

from database import get_db
from auth_utils import get_current_admin_user
from schemas.product import ProductOut, ProductVariant, IngredientRow

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"], dependencies=[Depends(get_current_admin_user)])

FRONTEND_IMAGES_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "assets" / "images"
FRONTEND_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# ─── Schemas for Admin Operations ───
class WebsiteSettingsIn(BaseModel):
    model_config = {"extra": "allow"}
    site_name: str
    support_email: str
    support_phone: str
    support_address: str
    fssai_number: str
    license_number: str
    announcement_banner_enabled: bool = True
    announcement_banner_text: str = ""
    razorpay_enabled: bool = True
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    delhivery_enabled: bool = False
    delhivery_api_token: str = ""
    delhivery_warehouse_name: str = ""
    delhivery_warehouse_address: str = ""
    delhivery_warehouse_city: str = ""
    delhivery_warehouse_state: str = ""
    delhivery_warehouse_pincode: str = ""
    delhivery_warehouse_phone: str = ""
    delhivery_environment: str = "staging"
    # Hero Section Fields
    hero_badge_text: str = "PREMIUM NATURAL WELLNESS"
    hero_title: str = 'Premium Gummies for<br><span class="text-gold">Active Health & Beauty.</span>'
    hero_title_main: str = "Premium Gummies for"
    hero_title_gold: str = "Active Health & Beauty."
    hero_subtitle: str = "Sugar-free, clinical-grade formulations crafted to fuel adult performance, daily glow, and kids' active growth. Experience modern Ayurveda and advanced science combined."
    hero_cta_text: str = "Explore Collection"
    hero_cta_link: str = "/shop"
    hero_trust_1: str = "100% Sugar-Free & Safe"
    hero_trust_2: str = "Free Shipping India-Wide"
    hero_image_path: str = "assets/images/hero-combo.jpg"
    hero_float_badge_1: str = "Adult Performance"
    hero_float_badge_2: str = "Beauty & Energy"
    hero_float_badge_3: str = "Kids' Immunity"
    # Trust Badges Section Fields
    trust_badge_1_title: str = "Sugar Free"
    trust_badge_1_sub: str = "No Added Sugar"
    trust_badge_2_title: str = "No Artificial Color"
    trust_badge_2_sub: str = "100% Safe Formulas"
    trust_badge_3_title: str = "Natural Fruit Flavor"
    trust_badge_3_sub: str = "Imli, Citrus & Mixed Fruit"
    trust_badge_4_title: str = "FSSAI Licensed"
    trust_badge_4_sub: str = "Regulated Quality"
    trust_badge_5_title: str = "36-Month Shelf Life"
    trust_badge_5_sub: str = "Long-Lasting Freshness"
    trust_badge_6_title: str = "Made in India"
    trust_badge_6_sub: str = "Kellen Healthcare"
    trust_badges: list[dict] = []
    # Label Transparency Section Fields
    transparency_subheading: str = "TRANSPARENCY"
    transparency_title: str = "Amount Per Gummy & Label Details"
    transparency_desc: str = "We believe in complete ingredient transparency. Here is the exact nutritional profile printed on our labels, tested for quality and purity."
    transparency_tabs: list[dict] = []
    # The Advantage Section Fields
    advantage_subheading: str = "THE ADVANTAGE"
    advantage_title: str = "Why The Family Wellness Combo?"
    advantage_desc: str = "Why buy multiple packs from different brands when you can cover the daily nutrient requirements of the entire household with one premium bundle?"
    advantage_cards: list[dict] = []
    # Guidance Section Fields
    guidance_subheading: str = "GUIDANCE"
    guidance_title: str = "How & Who It's For"
    guidance_desc: str = "Simple guidelines for the daily routine of each family member."
    guidance_columns: list[dict] = []
    # FAQ & Dietary Guide Section Fields
    faq_subheading: str = "ANSWERS"
    faq_title: str = "Frequently Asked Questions"
    faq_desc: str = "Got questions about dosage, safety, or suitability? We've got you covered."
    faq_items: list[dict] = []
    dietary_guide_subheading: str = "DIETARY USER GUIDE"
    dietary_guide_title: str = "Dosages & Usage Instructions"
    dietary_guide_desc: str = "Follow our certified dietary guides to maximize the energy, vitality, and cellular protection benefits of your daily Sonrup gummies."
    dietary_guide_cards: list[dict] = []
    # Our Story / About Us Section Fields
    story_subheading: str = "OUR STORY"
    story_title: str = "Himalayan Purity, Modern Scientific Wellness"
    story_desc: str = "At Sonrup™, we bridge the wisdom of traditional Ayurveda with clean, modern dietary science to empower the health of your entire household."
    story_bg_image: str = "assets/images/wellness-login-hero.jpg"
    story_sections: list[dict] = []
    story_stats: list[dict] = []
    # Blog Page Fields
    blog_subheading: str = "WELLNESS CORNER"
    blog_title: str = "The Sonrup Blog"
    blog_desc: str = "Expert insights, lifestyle tips, and the scientific research behind sugar-free Ayurvedic restauratives and premium multivitamin gummies."
    blog_articles: list[dict] = []

class ProductIn(BaseModel):
    slug: str
    name: str
    tag: str
    flavor: str
    price: int
    description: str
    benefits: List[str]
    images: List[str]
    tag_class: str = "tag-default"
    product_type: str = "single"
    variants: Optional[List[ProductVariant]] = []
    suggested_usage: Optional[str] = ""
    ingredients: Optional[List[IngredientRow]] = []

class ProductUpdateIn(BaseModel):
    name: Optional[str] = None
    tag: Optional[str] = None
    flavor: Optional[str] = None
    price: Optional[int] = None
    description: Optional[str] = None
    benefits: Optional[List[str]] = None
    images: Optional[List[str]] = None
    tag_class: Optional[str] = None
    product_type: Optional[str] = None
    variants: Optional[List[ProductVariant]] = None
    suggested_usage: Optional[str] = None
    ingredients: Optional[List[IngredientRow]] = None

class OrderStatusUpdateIn(BaseModel):
    status: str

class UserRoleUpdateIn(BaseModel):
    is_admin: bool

class InquiryStatusUpdateIn(BaseModel):
    status: str


def _clean_doc(doc: dict) -> dict:
    """Convert ObjectId fields to string for clean JSON response."""
    if not doc:
        return doc
    doc["_id"] = str(doc["_id"])
    return doc


# ─── 1. Dashboard Metrics & KPI Counters ───
@router.get("/stats")
async def get_dashboard_stats():
    """Retrieve platform-wide operational analytics and KPI numbers."""
    db = get_db()
    users_count = await db.users.count_documents({})
    products_count = await db.products.count_documents({})
    orders_count = await db.orders.count_documents({})
    inquiries_count = await db.contact_messages.count_documents({})
    
    # Calculate Total Revenue across all orders
    pipeline = [{"$group": {"_id": None, "total_revenue": {"$sum": "$total"}}}]
    cursor = db.orders.aggregate(pipeline)
    results = await cursor.to_list(1)
    total_revenue = results[0]["total_revenue"] if results else 0

    return {
        "revenue": total_revenue,
        "orders_count": orders_count,
        "products_count": products_count,
        "users_count": users_count,
        "inquiries_count": inquiries_count,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ─── 2. Website Content & Settings Editor ───
@router.get("/settings")
async def get_website_settings():
    """Get dynamic general website settings from MongoDB."""
    db = get_db()
    settings = await db.settings.find_one({"_id": "global_settings"})
    if not settings:
        settings = {
            "_id": "global_settings",
            "site_name": "Sonrup",
            "support_email": "info@sonrup.com",
            "support_phone": "+91 76001 75193",
            "support_address": "A 584 Sitaram Society, Punagam Road, Surat-395010",
            "fssai_number": "10726997000544",
            "license_number": "GA/646-A",
            "announcement_banner_enabled": True,
            "announcement_banner_text": "🌟 Free Express Shipping on All Wellness Orders Above ₹999 across India! 🚀",
            "razorpay_enabled": True,
            "razorpay_key_id": "rzp_test_SampleKey123",
            "razorpay_key_secret": "SampleSecretKey123456",
            "delhivery_enabled": False,
            "delhivery_api_token": "dummy",
            "delhivery_warehouse_name": "Sonrup Warehouse",
            "delhivery_warehouse_address": "A 584 Sitaram Society, Punagam Road",
            "delhivery_warehouse_city": "Surat",
            "delhivery_warehouse_state": "Gujarat",
            "delhivery_warehouse_pincode": "395010",
            "delhivery_warehouse_phone": "+91 76001 75193",
            "delhivery_environment": "staging"
        }
    if "razorpay_enabled" not in settings:
        settings["razorpay_enabled"] = True
    if "razorpay_key_id" not in settings:
        settings["razorpay_key_id"] = "rzp_test_SampleKey123"
    if "razorpay_key_secret" not in settings:
        settings["razorpay_key_secret"] = "SampleSecretKey123456"
    
    # Delhivery fields check
    for field, default in [
        ("delhivery_enabled", False),
        ("delhivery_api_token", "dummy"),
        ("delhivery_warehouse_name", "Sonrup Warehouse"),
        ("delhivery_warehouse_address", "A 584 Sitaram Society, Punagam Road"),
        ("delhivery_warehouse_city", "Surat"),
        ("delhivery_warehouse_state", "Gujarat"),
        ("delhivery_warehouse_pincode", "395010"),
        ("delhivery_warehouse_phone", "+91 76001 75193"),
        ("delhivery_environment", "staging"),
        # Hero Section fields
        ("hero_badge_text", "PREMIUM NATURAL WELLNESS"),
        ("hero_title", 'Premium Gummies for<br><span class="text-gold">Active Health & Beauty.</span>'),
        ("hero_title_main", "Premium Gummies for"),
        ("hero_title_gold", "Active Health & Beauty."),
        ("hero_subtitle", "Sugar-free, clinical-grade formulations crafted to fuel adult performance, daily glow, and kids' active growth. Experience modern Ayurveda and advanced science combined."),
        ("hero_cta_text", "Explore Collection"),
        ("hero_cta_link", "/shop"),
        ("hero_trust_1", "100% Sugar-Free & Safe"),
        ("hero_trust_2", "Free Shipping India-Wide"),
        ("hero_float_badge_3", "Kids' Immunity"),
        # Trust Badges Section Defaults
        ("trust_badge_1_title", "Sugar Free"),
        ("trust_badge_1_sub", "No Added Sugar"),
        ("trust_badge_2_title", "No Artificial Color"),
        ("trust_badge_2_sub", "100% Safe Formulas"),
        ("trust_badge_3_title", "Natural Fruit Flavor"),
        ("trust_badge_3_sub", "Imli, Citrus & Mixed Fruit"),
        ("trust_badge_4_title", "FSSAI Licensed"),
        ("trust_badge_4_sub", "Regulated Quality"),
        ("trust_badge_5_title", "36-Month Shelf Life"),
        ("trust_badge_5_sub", "Long-Lasting Freshness"),
        ("trust_badge_6_title", "Made in India"),
        ("trust_badge_6_sub", "Kellen Healthcare")
    ]:
        if field not in settings:
            settings[field] = default

    if "trust_badges" not in settings or not settings["trust_badges"]:
        settings["trust_badges"] = [
            {"id": "tb_1", "icon": "ban", "title": "Sugar Free", "subtitle": "No Added Sugar"},
            {"id": "tb_2", "icon": "droplet-off", "title": "No Artificial Color", "subtitle": "100% Safe Formulas"},
            {"id": "tb_3", "icon": "apple", "title": "Natural Fruit Flavor", "subtitle": "Imli, Citrus & Mixed Fruit"},
            {"id": "tb_4", "icon": "shield-check", "title": "FSSAI Licensed", "subtitle": "Regulated Quality"},
            {"id": "tb_5", "icon": "calendar", "title": "36-Month Shelf Life", "subtitle": "Long-Lasting Freshness"},
            {"id": "tb_6", "icon": "map-pin", "title": "Made in India", "subtitle": "Kellen Healthcare"}
        ]

    if "transparency_subheading" not in settings: settings["transparency_subheading"] = "TRANSPARENCY"
    if "transparency_title" not in settings: settings["transparency_title"] = "Amount Per Gummy & Label Details"
    if "transparency_desc" not in settings: settings["transparency_desc"] = "We believe in complete ingredient transparency. Here is the exact nutritional profile printed on our labels, tested for quality and purity."

    if "transparency_tabs" not in settings or not settings["transparency_tabs"] or len(settings["transparency_tabs"][2].get("rows", [])) < 5:
        settings["transparency_tabs"] = [
            {
                "id": "tab_shilajit",
                "name": "Himalayan Shilajit",
                "suggested_usage": "Take 1 Gummy daily or as directed by a healthcare professional. Best consumed after a meal.",
                "rows": [
                    {"component": "Gummy Shilajit Resin", "feature": "75% Fulvic Acid Strength", "amount": "200 mg"},
                    {"component": "Ashwagandha", "feature": "Withania somnifera", "amount": "25 mg"},
                    {"component": "Flavour", "feature": "Imli (Tamarind)", "amount": "Natural Blend"},
                    {"component": "Sugar", "feature": "Sugar-Free", "amount": "0g"}
                ]
            },
            {
                "id": "tab_biotin",
                "name": "Biotin + Multivitamin",
                "suggested_usage": "1 Gummy daily for adults. Chew thoroughly before swallowing.",
                "rows": [
                    {"component": "Vitamin C", "feature": "Ascorbic Acid", "amount": "30 mcg"},
                    {"component": "Vitamin B6", "feature": "Pyridoxine Hcl", "amount": "0.25 Mg"},
                    {"component": "Biotin", "feature": "Vitamin H / Hair Vitality", "amount": "30 Mcg"},
                    {"component": "Vitamin E", "feature": "Dl-A-Tocopheryl Acetate", "amount": "5 Mg"},
                    {"component": "Vitamin A", "feature": "Retinol Acetate", "amount": "500 Mcg"},
                    {"component": "Vitamin B12", "feature": "Cyanocobalamin", "amount": "1.1 Mcg"},
                    {"component": "Folic Acid", "feature": "Vitamin B9 / Folate", "amount": "169 Mcg"},
                    {"component": "Vitamin K2-7", "feature": "Menaquinone", "amount": "22.7 Mcg"},
                    {"component": "Zinc Citrate", "feature": "Immune Mineral", "amount": "3 Mg"},
                    {"component": "Iodine", "feature": "Potassium Iodide", "amount": "35 Mcg"}
                ]
            },
            {
                "id": "tab_kids",
                "name": "Kid's Multivitamin",
                "suggested_usage": "1 Gummy daily for children above 4 years of age under adult supervision.",
                "rows": [
                    {"component": "Vitamin A", "feature": "Retinol Acetate", "amount": "500 Iu"},
                    {"component": "Vitamin C", "feature": "Ascorbic Acid", "amount": "5 mg"},
                    {"component": "Vitamin D", "feature": "Cholecalciferol", "amount": "200 Iu"},
                    {"component": "Vitamin E", "feature": "Dl-A-Tocopherol", "amount": "0.5 Iu"},
                    {"component": "Vitamin B6", "feature": "Pyridoxine Hcl", "amount": "0.6 Mg"},
                    {"component": "Folic Acid", "feature": "Vitamin B9", "amount": "70 Mcg"},
                    {"component": "Vitamin B12", "feature": "Cyanocobalamin", "amount": "3 Mcg"},
                    {"component": "Biotin", "feature": "Vitamin H", "amount": "30 Mcg"},
                    {"component": "Pantothenic Acid", "feature": "Vitamin B5", "amount": "0.6 Mg"},
                    {"component": "Iodine", "feature": "Potassium Iodide", "amount": "21 Mcg"},
                    {"component": "Zinc", "feature": "Zinc Citrate", "amount": "1.35 Mg"},
                    {"component": "Choline", "feature": "Brain Development Support", "amount": "20 Mcg"},
                    {"component": "Inositol", "feature": "Cellular Signal Transduction", "amount": "20 Mcg"},
                    {"component": "Iron", "feature": "Ferrous Fumarate", "amount": "1 Mcg"}
                ]
            }
        ]

    if "advantage_subheading" not in settings: settings["advantage_subheading"] = "THE ADVANTAGE"
    if "advantage_title" not in settings: settings["advantage_title"] = "Why The Family Wellness Combo?"
    if "advantage_desc" not in settings: settings["advantage_desc"] = "Why buy multiple packs from different brands when you can cover the daily nutrient requirements of the entire household with one premium bundle?"

    if "advantage_cards" not in settings or not settings["advantage_cards"]:
        settings["advantage_cards"] = [
            {
                "id": "adv_1",
                "icon": "zap",
                "title": "Energy & Performance",
                "description": "Himalayan Shilajit (75% Fulvic Acid) combined with Ashwagandha helps increase stamina, strength, and daily energy levels for active adults."
            },
            {
                "id": "adv_2",
                "icon": "sparkles",
                "title": "Glowing Beauty & Health",
                "description": "Essential Biotin and Folic Acid ensure healthy skin, strong nails, and glowing hair, while 10 vitamins regulate cellular health."
            },
            {
                "id": "adv_3",
                "icon": "shield-alert",
                "title": "Shielded Kids' Immunity",
                "description": "Loaded with Vitamin C, D, Zinc, and Iron, our kids' formula boosts immunity, builds strong bones, and supports memory growth."
            },
            {
                "id": "adv_4",
                "icon": "smile",
                "title": "Delicious & Sugar Free",
                "description": "Enjoyable fruit flavors without the guilt. Formulated entirely sugar-free, making it the perfect daily chewable supplement."
            }
        ]

    if "guidance_subheading" not in settings: settings["guidance_subheading"] = "GUIDANCE"
    if "guidance_title" not in settings: settings["guidance_title"] = "How & Who It's For"
    if "guidance_desc" not in settings: settings["guidance_desc"] = "Simple guidelines for the daily routine of each family member."

    if "guidance_columns" not in settings or not settings["guidance_columns"]:
        settings["guidance_columns"] = [
            {
                "id": "col_him",
                "icon": "user",
                "title": "Him",
                "subtitle": "Father / Adult Male",
                "items": [
                    {"product": "Himalayan Shilajit Gummies", "usage": "Take 1 Gummy daily after breakfast or dinner."},
                    {"product": "Biotin + Multivitamin", "usage": "Take 1 Gummy daily for overall vitality and daily energy support."}
                ],
                "warning": ""
            },
            {
                "id": "col_her",
                "icon": "user-plus",
                "title": "Her",
                "subtitle": "Mother / Adult Female",
                "items": [
                    {"product": "Biotin + Multivitamin", "usage": "Take 1 Gummy daily in the morning to support hair, skin, nails, and energy."},
                    {"product": "Himalayan Shilajit", "usage": "Take 1 Gummy daily for strength and stamina, if active or exercising."}
                ],
                "warning": ""
            },
            {
                "id": "col_kids",
                "icon": "users",
                "title": "Kids",
                "subtitle": "Children (Ages 4+)",
                "items": [
                    {"product": "Kid's Multivitamin", "usage": "Chew 1 Gummy daily after school or lunch under parental supervision."}
                ],
                "warning": "Not suitable for kids under 4 years of age."
            }
        ]

    if "faq_subheading" not in settings: settings["faq_subheading"] = "ANSWERS"
    if "faq_title" not in settings: settings["faq_title"] = "Frequently Asked Questions"
    if "faq_desc" not in settings: settings["faq_desc"] = "Got questions about dosage, safety, or suitability? We've got you covered."

    if "faq_items" not in settings or not settings["faq_items"]:
        settings["faq_items"] = [
            {
                "id": "faq_1",
                "question": "What is the recommended age suitability for the kids' gummies?",
                "answer": "Our Kid's Multivitamin and Immunity Booster gummies are specifically formulated for kids aged 4 and above. We recommend 1 gummy daily under parental supervision. For children under 4, please consult your family pediatrician."
            },
            {
                "id": "faq_2",
                "question": "Are these gummies completely sugar-free?",
                "answer": "Yes! All three gummies in the Sonrup Family Wellness Combo are completely sugar-free and contain no added sugars. They are sweetened with premium natural substitutes, making them delicious without raising blood sugar levels."
            },
            {
                "id": "faq_3",
                "question": "What is the shelf life of these products?",
                "answer": "Each bottle has a shelf life of 36 months from the date of manufacture. Please store them in a cool, dry place away from direct sunlight, and keep the cap tightly sealed to maintain freshness."
            },
            {
                "id": "faq_4",
                "question": "How does the return policy work?",
                "answer": "We stand behind the quality of our products. If you are not satisfied with your purchase, you can contact our customer support team within 30 days of delivery for a full replacement or refund. No questions asked."
            },
            {
                "id": "faq_5",
                "question": "Can both men and women take the Shilajit and Biotin gummies?",
                "answer": "Absolutely. Both products are unisex. Shilajit gummies help improve stamina and strength for anyone, while Biotin + Multivitamin gummies support skin, hair, and nail health for all adults."
            }
        ]

    if "dietary_guide_subheading" not in settings: settings["dietary_guide_subheading"] = "DIETARY USER GUIDE"
    if "dietary_guide_title" not in settings: settings["dietary_guide_title"] = "Dosages & Usage Instructions"
    if "dietary_guide_desc" not in settings: settings["dietary_guide_desc"] = "Follow our certified dietary guides to maximize the energy, vitality, and cellular protection benefits of your daily Sonrup gummies."

    if "dietary_guide_cards" not in settings or not settings["dietary_guide_cards"]:
        settings["dietary_guide_cards"] = [
            {
                "id": "dg_1",
                "icon": "zap",
                "title": "Himalayan Shilajit",
                "card_type": "him",
                "timing": "Best consumed in the morning after breakfast for sustained, clean day-long active stamina.",
                "dosage": "1 Gummy daily. Do not exceed the recommended dose.",
                "target": "Exclusively formulated for adults. Not recommended for children or pregnant mothers."
            },
            {
                "id": "dg_2",
                "icon": "sparkles",
                "title": "Biotin & Multivitamin",
                "card_type": "her",
                "timing": "Can be consumed anytime. We recommend taking it after lunch or dinner as a healthy sugar-free dessert.",
                "dosage": "1 Gummy daily. Supports skin hydration and nail/hair keratin vitality.",
                "target": "Perfect for adults seeking glowing health."
            },
            {
                "id": "dg_3",
                "icon": "smile",
                "title": "Kid's Immunity booster",
                "card_type": "kids",
                "timing": "Take 1 gummy in the evening after playtime or school to replenish essential active micronutrients.",
                "dosage": "1 Gummy daily. Carefully balanced with Iron, Zinc, and Choline.",
                "target": "Formulated for active growing kids aged 5 to 16. Chew thoroughly before swallowing."
            }
        ]

    if "story_subheading" not in settings: settings["story_subheading"] = "OUR STORY"
    if "story_title" not in settings: settings["story_title"] = "Himalayan Purity, Modern Scientific Wellness"
    if "story_desc" not in settings: settings["story_desc"] = "At Sonrup™, we bridge the wisdom of traditional Ayurveda with clean, modern dietary science to empower the health of your entire household."
    if "story_bg_image" not in settings: settings["story_bg_image"] = "assets/images/wellness-login-hero.jpg"

    if "story_sections" not in settings or not settings["story_sections"]:
        settings["story_sections"] = [
            {
                "id": "story_1",
                "badge": "01. PURE SOURCE",
                "title": "Harvested From the Peaks",
                "image": "assets/images/shilajit-detail1.jpg",
                "p1": "Our flagship ingredient, pure Shilajit resin, is wild-harvested at elevations above 16,000 feet in the pristine Himalayan ranges. Formed over centuries, this dense Ayurvedic restorative is packed with over 84 ionic minerals.",
                "p2": "We purify this raw resin under strict laboratory standards to achieve an industry-leading 75% Fulvic Acid concentration, ensuring maximum bioavailability and strength in every single bite."
            },
            {
                "id": "story_2",
                "badge": "02. THE SCIENCE",
                "title": "100% Sugar-Free Nutrition",
                "image": "assets/images/biotin-detail1.jpg",
                "p1": "Most wellness gummies on the market are packed with processed sugars, glucose syrups, and gelatin—turning vital supplements into unhealthy candy. At Sonrup, we knew there was a better way.",
                "p2": "Our research team formulated a completely sugar-free gummie base that retains premium textures and natural, kid-approved fruit flavours (like Tamarind and Orange Citrus) without compromising your metabolic health."
            },
            {
                "id": "story_3",
                "badge": "03. TRUST & HYGIENE",
                "title": "GMP & ISO Certified Labs",
                "image": "assets/images/kids-detail1.jpg",
                "p1": "Quality and safety are the core pillars of Sonrup. Every bottle is manufactured at our state-of-the-art facility operated by Kellen Healthcare. Our plant operates under strict GMP (Good Manufacturing Practices) and ISO-9001 quality guidelines.",
                "p2": "From heavy-metal clearance tests to batch consistency, we guarantee a safe, pure, and premium supplement that you can trust for your children, parents, and yourself."
            }
        ]

    if "story_stats" not in settings or not settings["story_stats"]:
        settings["story_stats"] = [
            { "id": "stat_1", "number": "16k+ Ft", "label": "Himalayan Sourcing" },
            { "id": "stat_2", "number": "100%", "label": "Sugar-Free Formula" },
            { "id": "stat_3", "number": "GMP", "label": "Certified Facility" }
        ]

    if "blog_subheading" not in settings: settings["blog_subheading"] = "WELLNESS CORNER"
    if "blog_title" not in settings: settings["blog_title"] = "The Sonrup Blog"
    if "blog_desc" not in settings: settings["blog_desc"] = "Expert insights, lifestyle tips, and the scientific research behind sugar-free Ayurvedic restauratives and premium multivitamin gummies."

    if "blog_articles" not in settings or not settings["blog_articles"]:
        settings["blog_articles"] = [
            {
                "id": "blog_1",
                "title": "The Power of Pure Shilajit: Why Fulvic Acid Matters",
                "category": "Ayurveda",
                "image": "assets/images/shilajit-bottle.jpg",
                "excerpt": "Discover how Himalayan shilajit resin boosts stamina, supports cellular rejuvenation, and why our 75% Fulvic Acid Ayurvedic extract is safe for daily performance.",
                "link": "article.html?id=blog_1",
                "content": "<h2>The Science of Fulvic Acid</h2><p>Shilajit is a powerful sticky resin exuded from the rocks of the Himalayas. It develops over centuries from the slow decomposition of plants. For centuries, Ayurvedic practitioners have relied on it as a core rejuvenator.</p><p>Our 75% Fulvic Acid extract ensures maximum bioavailability, allowing the rich minerals to penetrate cellular walls effectively, boosting ATP production and physical stamina.</p>"
            },
            {
                "id": "blog_2",
                "title": "Biotin & Zinc: The Daily Vitality Shield",
                "category": "Science",
                "image": "assets/images/biotin-bottle.jpg",
                "excerpt": "Unpack the biological functions of high-potency Biotin (Vitamin H), Vitamin C, and Zinc in protecting nail strength, hair growth, and overall skin cell turnover.",
                "link": "article.html?id=blog_2",
                "content": "<h2>Cellular Protection</h2><p>Biotin, or Vitamin H, acts as a crucial coenzyme in the metabolism of fatty acids, carbohydrates, and amino acids. When combined with Zinc, the body's natural defense mechanism against oxidative stress is significantly enhanced.</p><p>Daily supplementation can dramatically improve keratin infrastructure, meaning thicker hair and stronger nails.</p>"
            },
            {
                "id": "blog_3",
                "title": "Sugar-Free Kids Nutrition: Safety & Pediatric Care",
                "category": "Nutrition",
                "image": "assets/images/kids-bottle.jpg",
                "excerpt": "Why we completely avoid high fructose corn syrup and sugar in children's multivitamins, focusing instead on safe fruit pectin, Iron, Zinc, and Choline.",
                "link": "article.html?id=blog_3",
                "content": "<h2>No Sugar, No Compromises</h2><p>The pediatric dietary guidelines are clear: added sugars are detrimental to early childhood development, contributing to metabolic irregularities and dental issues.</p><p>Our gummies use natural fruit pectin and stevia, delivering essential nutrients like Iron for cognitive development and Zinc for immune support without the sugar crash.</p>"
            }
        ]

    return settings


@router.put("/settings")
async def update_website_settings(data: WebsiteSettingsIn):
    """Update dynamic website settings in MongoDB."""
    db = get_db()
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc)
    await db.settings.update_one(
        {"_id": "global_settings"},
        {"$set": update_doc},
        upsert=True
    )
    update_doc["_id"] = "global_settings"
    return {"message": "Website settings successfully updated", "settings": update_doc}


# ─── 3. Product Catalog CRUD & Image Upload ───
@router.post("/upload-image")
async def upload_product_image(file: UploadFile = File(...)):
    """Upload a product picture and store it directly in local frontend/assets/images directory."""
    ext = Path(file.filename or "image.jpg").suffix
    filename = f"prod_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = FRONTEND_IMAGES_DIR / filename
    
    with dest_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"image_path": f"assets/images/{filename}", "message": "Image uploaded successfully"}


@router.post("/products", status_code=status.HTTP_201_CREATED)
async def create_product(data: ProductIn):
    """Create and publish a new item into the active website product catalog."""
    db = get_db()
    existing = await db.products.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product slug '{data.slug}' already exists.")
    
    prod_doc = data.model_dump()
    prod_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.products.insert_one(prod_doc)
    prod_doc["_id"] = str(result.inserted_id)
    return prod_doc


@router.put("/products/{slug}")
async def update_product(slug: str, data: ProductUpdateIn):
    """Modify an existing product in the catalog."""
    db = get_db()
    existing = await db.products.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
        
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_fields:
        return _clean_doc(existing)
        
    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.products.update_one({"slug": slug}, {"$set": update_fields})
    updated = await db.products.find_one({"slug": slug})
    return _clean_doc(updated)


@router.delete("/products/{slug}")
async def delete_product(slug: str):
    """Remove a product from the database."""
    db = get_db()
    result = await db.products.delete_one({"slug": slug})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return {"message": f"Product '{slug}' permanently removed from catalog."}


# ─── 4. Global Orders Overwatch ───
@router.get("/orders")
async def list_all_orders():
    """Retrieve all orders placed across the entire platform, newest first."""
    db = get_db()
    orders = await db.orders.find({}).sort("created_at", -1).to_list(1000)
    return [_clean_doc(o) for o in orders]


@router.put("/orders/{order_ref}/status")
async def update_order_status(order_ref: str, data: OrderStatusUpdateIn):
    """Update order shipping status (e.g. Processing -> Shipped -> Delivered)."""
    db = get_db()
    # Search by order_id string (e.g. SR123456) or _id ObjectId
    query = {"order_id": order_ref}
    if ObjectId.is_valid(order_ref):
        query = {"$or": [{"order_id": order_ref}, {"_id": ObjectId(order_ref)}]}
        
    result = await db.orders.update_one(query, {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return {"message": f"Order {order_ref} status updated to {data.status}."}


@router.post("/orders/{order_ref}/ship-delhivery")
async def ship_delhivery(order_ref: str):
    """Trigger manual shipment manifestation with Delhivery."""
    db = get_db()
    query = {"order_id": order_ref}
    if ObjectId.is_valid(order_ref):
        query = {"$or": [{"order_id": order_ref}, {"_id": ObjectId(order_ref)}]}
        
    order = await db.orders.find_one(query)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if order.get("waybill"):
        return {"message": "Shipment already manifested.", "waybill": order["waybill"]}

    settings = await db.settings.find_one({"_id": "global_settings"}) or {}
    
    from services.delhivery import create_shipment
    res = await create_shipment(order, settings)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delhivery Manifestation Failed: {res.get('message', 'Unknown Error')}"
        )

    waybill = res["waybill"]
    await db.orders.update_one(
        query,
        {
            "$set": {
                "waybill": waybill,
                "status": "Shipped",
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    return {"message": "Shipment manifested successfully via Delhivery.", "waybill": waybill}


# ─── 5. Registered Users Overwatch ───
@router.get("/users")
async def list_all_users():
    """List all registered customers (excluding password hashes)."""
    db = get_db()
    users = await db.users.find({}, {"hashed_password": 0}).sort("created_at", -1).to_list(1000)
    return [_clean_doc(u) for u in users]


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: UserRoleUpdateIn):
    """Elevate or revoke administrator privileges for a registered account."""
    db = get_db()
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format.")
        
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_admin": data.is_admin}})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return {"message": f"User {user_id} admin role set to {data.is_admin}."}


# ─── 6. Promo Coupons Manager ───
class CouponIn(BaseModel):
    code: str
    discount_type: str  # "percentage" or "fixed"
    discount_value: float
    min_order_value: int = 0
    is_active: bool = True


@router.get("/coupons")
async def list_admin_coupons():
    """List all promo coupons for admin panel."""
    db = get_db()
    coupons = await db.coupons.find().sort("created_at", -1).to_list(100)
    return [_clean_doc(c) for c in coupons]


@router.post("/coupons")
async def create_admin_coupon(data: CouponIn):
    """Create a new promo coupon."""
    db = get_db()
    code_clean = data.code.strip().upper()
    existing = await db.coupons.find_one({"code": code_clean})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Coupon '{code_clean}' already exists.")

    doc = {
        "code": code_clean,
        "discount_type": data.discount_type,
        "discount_value": data.discount_value,
        "min_order_value": data.min_order_value,
        "is_active": data.is_active,
        "usage_count": 0,
        "created_at": datetime.now(timezone.utc)
    }
    res = await db.coupons.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return _clean_doc(doc)


@router.put("/coupons/{code}")
async def update_admin_coupon(code: str, data: CouponIn):
    """Update an existing promo coupon."""
    db = get_db()
    code_clean = code.strip().upper()
    update_data = {
        "discount_type": data.discount_type,
        "discount_value": data.discount_value,
        "min_order_value": data.min_order_value,
        "is_active": data.is_active
    }
    res = await db.coupons.update_one({"code": code_clean}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found.")
    updated = await db.coupons.find_one({"code": code_clean})
    return _clean_doc(updated)


@router.delete("/coupons/{code}")
async def delete_admin_coupon(code: str):
    """Delete a promo coupon."""
    db = get_db()
    res = await db.coupons.delete_one({"code": code.upper()})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found.")
    return {"message": f"Coupon '{code}' deleted."}


# ─── 7. Contact Us Inquiries Overwatch ───
@router.get("/inquiries")
async def list_all_inquiries():
    """Retrieve all contact form inquiries submitted by website visitors, newest first."""
    db = get_db()
    messages = await db.contact_messages.find({}).sort("created_at", -1).to_list(1000)
    result = []
    for msg in messages:
        doc = _clean_doc(msg)
        if "created_at" in doc and isinstance(doc["created_at"], datetime):
            dt = doc["created_at"]
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            doc["created_at"] = dt.isoformat()
        result.append(doc)
    return result


@router.put("/inquiries/{inquiry_id}/status")
async def update_inquiry_status(inquiry_id: str, data: InquiryStatusUpdateIn):
    """Update contact inquiry status (e.g. New -> Read -> Replied)."""
    db = get_db()
    if not ObjectId.is_valid(inquiry_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid inquiry ID format.")
    
    result = await db.contact_messages.update_one(
        {"_id": ObjectId(inquiry_id)},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found.")
    return {"message": f"Inquiry status updated to {data.status}."}


@router.delete("/inquiries/{inquiry_id}")
async def delete_inquiry(inquiry_id: str):
    """Remove a contact inquiry message from the database."""
    db = get_db()
    if not ObjectId.is_valid(inquiry_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid inquiry ID format.")
    
    result = await db.contact_messages.delete_one({"_id": ObjectId(inquiry_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found.")
    return {"message": "Contact inquiry permanently deleted."}

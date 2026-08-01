import json
import urllib.request
import urllib.parse
from typing import Dict, Any

def get_delhivery_api_url(endpoint: str, environment: str = "staging") -> str:
    """Resolve API URL based on staging/production environment."""
    base = "https://staging-express.delhivery.com" if environment == "staging" else "https://track.delhivery.com"
    return f"{base.rstrip('/')}/{endpoint.lstrip('/')}"

async def check_pincode_serviceability(pincode: str, settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if a pincode is serviceable by Delhivery.
    Endpoint: /c/api/pin-codes/json/
    """
    token = settings.get("delhivery_api_token", "")
    env = settings.get("delhivery_environment", "staging")
    
    # Fallback/mock check if using dummy/empty tokens
    if not token or "Sample" in token or "dummy" in token or len(token) != 40:
        # Simulate standard Indian pincodes
        valid = len(pincode) == 6 and pincode.isdigit()
        is_cod = not pincode.startswith("9")  # Mock COD availability
        return {
            "serviceable": valid,
            "prepaid": valid,
            "cod": valid and is_cod,
            "city": "Mumbai" if pincode.startswith("4") else "Delhi" if pincode.startswith("1") else "Surat",
            "state": "Maharashtra" if pincode.startswith("4") else "Delhi" if pincode.startswith("1") else "Gujarat",
            "provider": "Delhivery"
        }

    try:
        url = get_delhivery_api_url(f"/c/api/pin-codes/json/?filter_codes={pincode}", env)
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Token {token}",
                "Accept": "application/json"
            }
        )
        # Synchronous urlopen wrapped for simplicity
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode())
            # Parse Delhivery response payload
            delivery_codes = res_data.get("delivery_codes", [])
            if delivery_codes:
                info = delivery_codes[0].get("postal_code", {})
                return {
                    "serviceable": info.get("is_serviceable", False),
                    "prepaid": info.get("pre_paid", "N") == "Y",
                    "cod": info.get("cod", "N") == "Y",
                    "city": info.get("district", "Unknown"),
                    "state": info.get("state_name", "Unknown"),
                    "provider": "Delhivery"
                }
    except Exception as e:
        print(f"⚠️ Delhivery Pincode Serviceability API error: {e}")
    
    return {"serviceable": False, "prepaid": False, "cod": False, "city": "", "state": "", "provider": "Delhivery"}


async def create_shipment(order: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Manifest a shipment with Delhivery.
    Endpoint: /api/cmu/create.json
    """
    token = settings.get("delhivery_api_token", "")
    env = settings.get("delhivery_environment", "staging")
    warehouse = settings.get("delhivery_warehouse_name", "Sonrup Warehouse")

    shipping = order.get("shipping", {})
    total_amt = order.get("total", 0)
    payment_method = order.get("payment_method", "COD")
    order_id = order.get("order_id", "SR000000")

    # Fallback/mock shipment creation if using dummy/empty tokens
    if not token or "Sample" in token or "dummy" in token or len(token) != 40:
        import random
        waybill = f"998877{random.randint(100000, 999999)}"
        return {
            "success": True,
            "waybill": waybill,
            "message": "Shipment manifested successfully (Simulated Test Mode).",
            "status": "Manifested"
        }

    try:
        # Build Delhivery Package Details JSON format
        payload = {
            "shipments": [
                {
                    "name": shipping.get("name", "Customer"),
                    "add": shipping.get("address", ""),
                    "pin": shipping.get("pincode", ""),
                    "phone": shipping.get("phone", ""),
                    "payment_mode": "Prepaid" if payment_method != "COD" else "COD",
                    "cod_amount": total_amt if payment_method == "COD" else 0,
                    "order": order_id,
                    "client": "Sonrup",
                    "order_date": order.get("created_at", "").isoformat() if hasattr(order.get("created_at"), "isoformat") else "",
                    "total_amount": total_amt,
                    "quantity": sum(item.get("quantity", 1) for item in order.get("items", []))
                }
            ],
            "pickup_location": {
                "name": warehouse,
                "add": settings.get("delhivery_warehouse_address", "Warehouse HQ"),
                "city": settings.get("delhivery_warehouse_city", "Surat"),
                "state": settings.get("delhivery_warehouse_state", "Gujarat"),
                "pin": settings.get("delhivery_warehouse_pincode", "395010"),
                "phone": settings.get("delhivery_warehouse_phone", "+91 76001 75193")
            }
        }

        url = get_delhivery_api_url("/api/cmu/create.json", env)
        req_data = f"format=json&data={urllib.parse.quote(json.dumps(payload))}".encode("utf-8")
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={
                "Authorization": f"Token {token}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=8) as response:
            res_data = json.loads(response.read().decode())
            packages = res_data.get("packages", [])
            if packages and packages[0].get("status") == "Success":
                return {
                    "success": True,
                    "waybill": packages[0].get("waybill", ""),
                    "message": "Delhivery shipment manifested successfully.",
                    "status": "Manifested"
                }
            else:
                msg = packages[0].get("remarks", ["Unknown error"])[0] if packages else "Manifest creation failed"
                return {"success": False, "waybill": "", "message": msg, "status": "Failed"}
    except Exception as e:
        print(f"⚠️ Delhivery Shipment Manifest API error: {e}")
        return {"success": False, "waybill": "", "message": str(e), "status": "Failed"}


async def track_shipment(waybill: str, settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieve live tracking details for a shipment waybill.
    Endpoint: /api/v1/packages/json/
    """
    token = settings.get("delhivery_api_token", "")
    env = settings.get("delhivery_environment", "staging")

    # Fallback/mock tracking logs if using dummy/empty tokens
    if not token or "Sample" in token or "dummy" in token or len(token) != 40:
        # Simulate tracking progression based on waybill digits
        return {
            "success": True,
            "waybill": waybill,
            "status": "In Transit",
            "origin": "Surat Warehouse",
            "destination": "Customer Location",
            "scans": [
                {"date": "29/07/2026 18:30", "status": "Out for Delivery", "activity": "Shipment is out with courier partner"},
                {"date": "29/07/2026 10:15", "status": "In Transit", "activity": "Arrived at destination delivery hub"},
                {"date": "29/07/2026 02:40", "status": "In Transit", "activity": "Dispatched from primary sorting facility"},
                {"date": "28/07/2026 21:00", "status": "Manifested", "activity": "Shipment pickup scheduled from Sonrup Warehouse HQ"}
            ]
        }

    try:
        url = get_delhivery_api_url(f"/api/v1/packages/json/?waybill={waybill}", env)
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Token {token}",
                "Accept": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode())
            shipment_data = res_data.get("ShipmentData", [])
            if shipment_data:
                pkg = shipment_data[0].get("Shipment", {})
                scans = []
                for s in pkg.get("Scans", []):
                    scan_detail = s.get("ScanDetail", {})
                    scans.append({
                        "date": scan_detail.get("ScanDateTime", ""),
                        "status": scan_detail.get("ScanType", ""),
                        "activity": scan_detail.get("Instructions", "")
                    })
                return {
                    "success": True,
                    "waybill": waybill,
                    "status": pkg.get("Status", {}).get("Status", "Unknown"),
                    "origin": pkg.get("Origin", ""),
                    "destination": pkg.get("Destination", ""),
                    "scans": scans
                }
    except Exception as e:
        print(f"⚠️ Delhivery Tracking API error: {e}")
    
    return {
        "success": False,
        "waybill": waybill,
        "status": "Tracking Unavailable",
        "origin": "",
        "destination": "",
        "scans": []
    }

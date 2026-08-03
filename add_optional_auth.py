import os

filepath = "backend/auth_utils.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

optional_user_code = """
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
) -> Optional[dict]:
    \"\"\"Dependency: extract user from JWT if present, otherwise return None.\"\"\"
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
            
        db = get_db()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
            
        user["_id"] = str(user["_id"])
        return user
    except Exception:
        return None

async def get_current_admin_user(
"""

target = "async def get_current_admin_user("

if target in content and "get_current_user_optional" not in content:
    content = content.replace(target, optional_user_code.strip() + "\n")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added get_current_user_optional to auth_utils.py")
else:
    print("Target not found or already added.")

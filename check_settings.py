import asyncio
import sys
sys.path.append('backend')
from database import connect_db

async def main():
    db = await connect_db()
    settings = await db.settings.find_one({'_id': 'global_settings'})
    print(settings)

asyncio.run(main())

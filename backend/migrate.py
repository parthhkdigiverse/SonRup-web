import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate():
    client = AsyncIOMotorClient('mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/Sonrup?retryWrites=true&w=majority&appName=Cluster0')
    db = client['Sonrup']
    
    settings = await db.settings.find_one({'_id': 'global_settings'})
    tabs = settings.get('transparency_tabs', [])
    
    for tab in tabs:
        slug = tab['id'].replace('tab_', '')
        ingredients = tab.get('rows', [])
        suggested_usage = tab.get('suggested_usage', '')
        
        await db.products.update_many(
            {'slug': slug},
            {'$set': {'ingredients': ingredients, 'suggested_usage': suggested_usage}}
        )
        print(f'Migrated {slug}')
        
    print('Migration complete')

if __name__ == "__main__":
    asyncio.run(migrate())

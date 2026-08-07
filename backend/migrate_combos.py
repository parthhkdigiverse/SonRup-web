import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_combos():
    client = AsyncIOMotorClient('mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/Sonrup?retryWrites=true&w=majority&appName=Cluster0')
    db = client['Sonrup']
    
    # Fetch singles
    shilajit = await db.products.find_one({'slug': 'shilajit'})
    biotin = await db.products.find_one({'slug': 'biotin'})
    kids = await db.products.find_one({'slug': 'kids'})
    
    shilajit_ing = shilajit.get('ingredients', [])
    biotin_ing = biotin.get('ingredients', [])
    kids_ing = kids.get('ingredients', [])
    
    # Adult Duo
    await db.products.update_one(
        {'slug': 'adult-duo'},
        {'$set': {
            'ingredients': shilajit_ing + biotin_ing,
            'suggested_usage': "Take 1 Gummy of each daily or as directed by a healthcare professional."
        }}
    )
    
    # Family Combo
    await db.products.update_one(
        {'slug': 'family-combo'},
        {'$set': {
            'ingredients': shilajit_ing + biotin_ing + kids_ing,
            'suggested_usage': "Adults take 1 Shilajit and 1 Biotin daily. Children take 1 Kids gummy daily."
        }}
    )
    
    # Mom Kid
    await db.products.update_one(
        {'slug': 'mom-kid'},
        {'$set': {
            'ingredients': biotin_ing + kids_ing,
            'suggested_usage': "Mom takes 1 Biotin daily. Child takes 1 Kids gummy daily."
        }}
    )
    
    # Dad Kid
    await db.products.update_one(
        {'slug': 'dad-kid'},
        {'$set': {
            'ingredients': shilajit_ing + kids_ing,
            'suggested_usage': "Dad takes 1 Shilajit daily. Child takes 1 Kids gummy daily."
        }}
    )

    print('Combo migration complete')

if __name__ == "__main__":
    asyncio.run(migrate_combos())

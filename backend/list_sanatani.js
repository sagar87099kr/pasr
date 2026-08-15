const mongoose = require('mongoose');
require('dotenv').config();
const Shop = require('./data/shops.js');
const Item = require('./data/item.js');

async function investigate() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL, { family: 4 });
        
        const shop = await Shop.findOne({ shopName: 'सनातनी_FOOD_COURT' });
        console.log("Sanatani Shop:", shop ? { id: shop._id, verified: shop.verified, isActive: shop.isActive } : "Not found");
        
        if (shop) {
            const items = await Item.find({ shop: shop._id }).select('name quantity isVerified isActive');
            console.log("\nSanatani Items:", items);
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
investigate();

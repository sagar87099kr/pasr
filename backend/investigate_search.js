const mongoose = require('mongoose');
require('dotenv').config();

const Shop = require('./data/shops.js');
const Item = require('./data/item.js');

async function investigate() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL, { family: 4 });
        
        const rockstarShop = await Shop.findOne({ shopName: /rockstar/i });
        const sanataniShop = await Shop.findOne({ shopName: /sanatani/i });

        console.log("Rockstar Shop:", rockstarShop ? { id: rockstarShop._id, verified: rockstarShop.verified, isActive: rockstarShop.isActive } : "Not found");
        console.log("Sanatani Shop:", sanataniShop ? { id: sanataniShop._id, verified: sanataniShop.verified, isActive: sanataniShop.isActive } : "Not found");

        if (!rockstarShop || !sanataniShop) {
            process.exit(0);
        }

        const rockstarItems = await Item.find({ shop: rockstarShop._id, name: /roll/i }).select('name quantity isVerified isActive');
        const sanataniItems = await Item.find({ shop: sanataniShop._id, name: /roll/i }).select('name quantity isVerified isActive');

        console.log("\nRockstar 'roll' items:", rockstarItems);
        console.log("\nSanatani 'roll' items:", sanataniItems);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
investigate();

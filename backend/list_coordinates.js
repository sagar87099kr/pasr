const mongoose = require('mongoose');
require('dotenv').config();
const Shop = require('./data/shops.js');

async function investigate() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL, { family: 4 });
        
        const rs = await Shop.findOne({ shopName: /Rockstar/i }).select('shopName geometry deliveryEnabled serviceAreaRadius');
        const san = await Shop.findOne({ shopName: 'सनातनी_FOOD_COURT' }).select('shopName geometry deliveryEnabled serviceAreaRadius');
        console.log("Rockstar:", JSON.stringify(rs, null, 2));
        console.log("Sanatani:", JSON.stringify(san, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
investigate();

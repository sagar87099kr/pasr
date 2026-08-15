const mongoose = require('mongoose');
require('dotenv').config();
const Shop = require('./data/shops.js');

async function investigate() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL, { family: 4 });
        
        const rs = await Shop.findOne({ shopName: /Rockstar/i }).select('shopName isSponsored verified');
        const san = await Shop.findOne({ shopName: 'सनातनी_FOOD_COURT' }).select('shopName isSponsored verified');
        console.log("Rockstar:", rs);
        console.log("Sanatani:", san);
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
investigate();

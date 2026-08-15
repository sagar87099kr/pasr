const mongoose = require('mongoose');
require('dotenv').config();
const Shop = require('./data/shops.js');
async function investigate() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL, { family: 4 });
        const shops = await Shop.find({ shopName: { $regex: /san/i } }).select('shopName verified isActive');
        console.log("Shops with 'san':", shops.map(s => s.shopName));
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
investigate();

const mongoose = require('mongoose');
require('dotenv').config();
const Item = require('./data/item.js');
const MasterProduct = require('./data/masterProduct.js');
const Shop = require('./data/shops.js');

async function investigate() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL, { family: 4 });
        const items = await Item.find({ name: { $regex: /roll/i } }).populate('shop', 'shopName');
        console.log("Items with 'roll':");
        items.forEach(i => console.log(`- ${i.name} (Shop: ${i.shop ? i.shop.shopName : 'None'})`));
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
investigate();

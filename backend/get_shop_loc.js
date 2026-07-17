const mongoose = require('mongoose');
require('dotenv').config();
const Shop = require('./data/shops.js');
const Customer = require('./data/customers.js');
const distanceUtil = require('./utils/distance.js');

mongoose.connect(process.env.ATLAS_DB_URL).then(async () => {
    // 24.4088427, 85.9840865
    const lat1 = 24.4088427;
    const lon1 = 85.9840865;
    const shops = await Shop.find({});
    for (const shop of shops) {
        if(shop.geometry && shop.geometry.coordinates) {
           const lat2 = shop.geometry.coordinates[1];
           const lon2 = shop.geometry.coordinates[0];
           const dist = await distanceUtil.calculateDistance(lat1, lon1, lat2, lon2, true);
           console.log(`Shop: ${shop.shopName}, Dist: ${dist} km, Location: ${lat2}, ${lon2}`);
        }
    }
    process.exit(0);
});

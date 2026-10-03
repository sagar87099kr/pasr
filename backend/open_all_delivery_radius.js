require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

const Shop = require('./data/shops.js');
const Bazaar = require('./data/bazaar.js');

async function openDeliveryRadius() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(process.env.ATLAS_DB_URL, { tlsInsecure: true });
        console.log("Connected to MongoDB.");

        // 1. Expand all Bazaars' radius to 50 km (50000 meters)
        const bazaarUpdate = await Bazaar.updateMany(
            {},
            { $set: { radius: 50000, isActive: true } }
        );
        console.log(`Updated ${bazaarUpdate.modifiedCount} Bazaar(s) with 50km radius.`);

        // 2. Expand all Ghorthamba & general shops' serviceAreaRadius to 50 km and ensure deliveryEnabled is true
        const ghorthambaBazaar = await Bazaar.findOne({ name: { $regex: /^ghorthamba$/i } });
        
        const shopUpdate = await Shop.updateMany(
            {
                $or: [
                    { bazaar: ghorthambaBazaar ? ghorthambaBazaar._id : null },
                    { location: { $regex: /ghorthamba|ghorthmba|ghorthambha/i } },
                    { shopName: { $regex: /ghorthamba|ghorthmba|ghorthambha/i } }
                ]
            },
            {
                $set: {
                    deliveryEnabled: true,
                    serviceAreaRadius: 50,
                    closingTime: "21:00",
                    isActive: true
                }
            }
        );
        console.log(`Updated ${shopUpdate.modifiedCount} Ghorthamba shop(s) with serviceAreaRadius=50km, deliveryEnabled=true.`);

        // 3. Also update all active verified shops across the platform to have wide serviceAreaRadius
        const allShopsUpdate = await Shop.updateMany(
            { deliveryEnabled: true },
            { $set: { serviceAreaRadius: 50 } }
        );
        console.log(`Updated ${allShopsUpdate.modifiedCount} delivery-enabled shop(s) across platform to 50km radius.`);

        console.log("\n Delivery area successfully opened with no 5km restriction!");
        process.exit(0);
    } catch (err) {
        console.error("Error opening delivery radius:", err);
        process.exit(1);
    }
}

openDeliveryRadius();

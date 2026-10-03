require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

const Shop = require('./data/shops.js');
const Bazaar = require('./data/bazaar.js');

async function updateGhorthambaDelivery() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(process.env.ATLAS_DB_URL, { tlsInsecure: true });
        console.log("Connected to MongoDB.");

        // 1. Configure or update Bazaar for Ghorthamba
        let ghorthambaBazaar = await Bazaar.findOne({ name: { $regex: /^ghorthamba$/i } });
        if (!ghorthambaBazaar) {
            ghorthambaBazaar = new Bazaar({
                name: 'Ghorthamba',
                location: 'Giridih, Jharkhand',
                geometry: {
                    type: 'Point',
                    coordinates: [85.87, 24.44]
                },
                radius: 5000,
                isActive: true
            });
            await ghorthambaBazaar.save();
            console.log(`Created Bazaar: ${ghorthambaBazaar.name} with radius ${ghorthambaBazaar.radius / 1000}km`);
        } else {
            ghorthambaBazaar.radius = 5000;
            ghorthambaBazaar.isActive = true;
            await ghorthambaBazaar.save();
            console.log(`Updated Bazaar: ${ghorthambaBazaar.name} with radius ${ghorthambaBazaar.radius / 1000}km (Active: true)`);
        }

        // 2. Find all shops in Ghorthamba
        const shops = await Shop.find({
            $or: [
                { bazaar: ghorthambaBazaar._id },
                { location: { $regex: /ghorthamba|ghorthmba|ghorthambha/i } },
                { shopName: { $regex: /ghorthamba|ghorthmba|ghorthambha/i } }
            ]
        });

        console.log(`\nFound ${shops.length} shop(s) for Ghorthamba:`);

        for (const shop of shops) {
            const oldDelivery = shop.deliveryEnabled;
            const oldRadius = shop.serviceAreaRadius;
            const oldClosing = shop.closingTime;

            shop.deliveryEnabled = true;
            shop.serviceAreaRadius = 5;
            shop.closingTime = "21:00";
            if (!shop.openingTime) {
                shop.openingTime = "08:00";
            }
            shop.bazaar = ghorthambaBazaar._id;

            await shop.save();
            console.log(` - "${shop.shopName}" (${shop.location}):`);
            console.log(`     Delivery Enabled: ${oldDelivery} -> true`);
            console.log(`     Radius: ${oldRadius}km -> 5km`);
            console.log(`     Closing: ${oldClosing} -> ${shop.closingTime}`);
        }

        console.log("\n Home delivery orders for Ghorthamba successfully opened!");
        process.exit(0);
    } catch (err) {
        console.error("Update error:", err);
        process.exit(1);
    }
}

updateGhorthambaDelivery();

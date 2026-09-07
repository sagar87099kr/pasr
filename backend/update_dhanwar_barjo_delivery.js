require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

const Shop = require('./data/shops.js');
const Bazaar = require('./data/bazaar.js');

async function updateDeliveryConfig() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(process.env.ATLAS_DB_URL, { tlsInsecure: true });
        console.log("Connected to MongoDB.");

        // 1. Configure or create Bazaars for Dhanwar and Barjo
        const targetBazaars = [
            {
                name: 'Dhanwar',
                location: 'Giridih, Jharkhand',
                coordinates: [85.9822, 24.4106],
                radius: 5000 // 5km
            },
            {
                name: 'Barjo',
                location: 'Giridih, Jharkhand',
                coordinates: [85.9650, 24.4250],
                radius: 5000 // 5km
            }
        ];

        const bazaarMap = {};

        for (const b of targetBazaars) {
            let bazaar = await Bazaar.findOne({ name: { $regex: new RegExp(`^${b.name}$`, 'i') } });
            if (!bazaar) {
                bazaar = new Bazaar({
                    name: b.name,
                    location: b.location,
                    geometry: {
                        type: 'Point',
                        coordinates: b.coordinates
                    },
                    radius: b.radius,
                    isActive: true
                });
                await bazaar.save();
                console.log(` Created Bazaar: ${bazaar.name} with radius ${bazaar.radius / 1000}km`);
            } else {
                bazaar.radius = b.radius;
                bazaar.isActive = true;
                await bazaar.save();
                console.log(` Updated existing Bazaar: ${bazaar.name} with radius ${bazaar.radius / 1000}km`);
            }
            bazaarMap[b.name.toLowerCase()] = bazaar._id;
        }

        // 2. Find and update all shops in Dhanwar and Barjo
        const shops = await Shop.find({
            $or: [
                { location: { $regex: /dhanwar|barjo/i } },
                { shopName: { $regex: /dhanwar|barjo|naresh/i } },
                { bazaar: { $in: Object.values(bazaarMap) } }
            ]
        });

        console.log(`\nFound ${shops.length} shop(s) for Dhanwar and Barjo:`);

        for (const shop of shops) {
            const oldClosing = shop.closingTime || 'Not set';
            const oldRadius = shop.serviceAreaRadius || 'Not set';

            // Set closing time to 9:00 PM ("21:00")
            shop.closingTime = "21:00";
            if (!shop.openingTime) {
                shop.openingTime = "09:00";
            }

            // Set service area radius to 5 km
            shop.serviceAreaRadius = 5;
            shop.deliveryEnabled = true;

            // Link to appropriate bazaar if not linked
            if (!shop.bazaar) {
                if (/barjo/i.test(shop.location) || /barjo/i.test(shop.shopName)) {
                    shop.bazaar = bazaarMap['barjo'];
                } else {
                    shop.bazaar = bazaarMap['dhanwar'];
                }
            }

            await shop.save();
            console.log(` - "${shop.shopName}" (${shop.location}):`);
            console.log(`     Radius: ${oldRadius}km -> ${shop.serviceAreaRadius}km`);
            console.log(`     Closing Time: ${oldClosing} -> ${shop.closingTime} (9:00 PM)`);
            console.log(`     Delivery Enabled: ${shop.deliveryEnabled}`);
        }

        console.log("\n All Dhanwar & Barjo delivery configurations successfully updated!");
        process.exit(0);
    } catch (err) {
        console.error("Update error:", err);
        process.exit(1);
    }
}

updateDeliveryConfig();

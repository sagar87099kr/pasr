require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Shop = require('./data/shops.js');
const Item = require('./data/item.js');

async function inject() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(process.env.ATLAS_DB_URL, { tlsInsecure: true });
        console.log("MongoDB Connected successfully.");

        // Find the specific shop "Naresh hotel & Sons"
        const targetShop = await Shop.findOne({ shopName: /naresh.*hotel/i });
        if (!targetShop) {
            console.error("ERROR: No shop found matching 'Naresh hotel'. Aborting.");
            process.exit(1);
        }
        console.log(`\nSelected Target Shop: "${targetShop.shopName}" (ID: ${targetShop._id})`);

        // Read updated products JSON
        const jsonPath = path.resolve(__dirname, '../../Passer_All_Products.json');
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const products = JSON.parse(rawData);
        console.log(`Loaded ${products.length} products with accurate, specific dish image URLs.`);

        // Remove previously injected items for this shop to keep inventory clean
        const deletedResult = await Item.deleteMany({ shop: targetShop._id });
        console.log(`Cleaned ${deletedResult.deletedCount} old items for shop.`);

        // Prepare new item documents
        const itemDocs = products.map((p, idx) => {
            const imageUrl = p.img && p.img.url ? p.img.url : (p.itemImages && p.itemImages.length > 0 ? p.itemImages[0] : "");
            const sanitizedName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
            
            return {
                name: p.name,
                img: {
                    url: imageUrl,
                    filename: `naresh_${idx}_${sanitizedName}`
                },
                extraImages: [],
                description: p.description || "",
                price: Number(p.price),
                discount: Number(p.discount || p.offer || 0),
                quantity: Number(p.quantity || 25),
                itemCategory: p.itemCategory || "Veg Dishes",
                shop: targetShop._id,
                isActive: true,
                availableForDelivery: true,
                canDeliverByBike: true,
                deliveryType: "standard"
            };
        });

        console.log(`Inserting ${itemDocs.length} items with updated specific image URLs...`);
        const insertedItems = await Item.insertMany(itemDocs);
        console.log(`Successfully created ${insertedItems.length} items in Item collection.`);

        // Reset targetShop.items to the fresh list of IDs
        targetShop.items = insertedItems.map(item => item._id);
        await targetShop.save();

        console.log(`\n SUCCESS!`);
        console.log(`Shop "${targetShop.shopName}" now has ${targetShop.items.length} updated products with distinct dish images.`);

        process.exit(0);
    } catch (err) {
        console.error("Injection error:", err);
        process.exit(1);
    }
}

inject();

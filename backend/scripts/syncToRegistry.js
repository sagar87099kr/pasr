const mongoose = require("mongoose");
const MasterProduct = require("../data/masterProduct");
const ItemImageRegistry = require("../data/itemImageRegistry");
const { normalizeItemName } = require("../utils/normalization");
require('dotenv').config();

async function syncMasterToRegistry() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        console.log("Connected to DB for sync...");

        const masterProducts = await MasterProduct.find({ "img.url": { $exists: true, $ne: "" } });
        console.log(`Found ${masterProducts.length} master products with images.`);

        for (const mp of masterProducts) {
            const canonical = normalizeItemName(mp.name);

            // Check if already exists in registry
            const existing = await ItemImageRegistry.findOne({
                $or: [
                    { publicId: mp.img.filename },
                    { canonicalName: canonical, displayName: mp.name }
                ]
            });

            if (!existing) {
                await ItemImageRegistry.create({
                    canonicalName: canonical,
                    displayName: mp.name,
                    description: mp.description || `High quality ${mp.name}`,
                    imageUrl: mp.img.url,
                    publicId: mp.img.filename,
                    itemCategory: mp.category,
                    usageCount: 0,
                    locked: true
                });
                console.log(`Added to Registry: ${mp.name}`);
            } else {
                console.log(`Skipped (already exists): ${mp.name}`);
            }
        }

        console.log("Sync complete!");
        process.exit(0);
    } catch (err) {
        console.error("Sync failed:", err);
        process.exit(1);
    }
}

syncMasterToRegistry();

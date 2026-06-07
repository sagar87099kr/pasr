const mongoose = require("mongoose");
const ItemImageRegistry = require("../data/itemImageRegistry");
require("dotenv").config();

async function clearRegistry() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        console.log("Connected to MongoDB for cleanup...");
        const result = await ItemImageRegistry.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} entries from ItemImageRegistry.`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed:", err);
        process.exit(1);
    }
}

clearRegistry();

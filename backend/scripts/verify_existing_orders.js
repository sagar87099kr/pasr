const mongoose = require('mongoose');
const Order = require('../data/order');
require('dotenv').config(); // Load from CWD

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.ATLAS_DB_URL);
        console.log("Connected.");

        // Verify all existing orders to prevent them from disappearing 
        // from any past records in shop dashboards.
        const result = await Order.updateMany(
            { adminVerified: { $ne: true } }, 
            { $set: { adminVerified: true } }
        );

        console.log(`Migration Complete: Successfully marked ${result.modifiedCount} existing orders as adminVerified = true.`);
        
        process.exit(0);
    } catch (e) {
        console.error("Migration Failed:", e);
        process.exit(1);
    }
}

migrate();

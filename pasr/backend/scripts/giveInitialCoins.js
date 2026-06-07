const mongoose = require("mongoose");
const Customer = require("../data/customers.js");
require("dotenv").config();

async function giveInitialCoins() {
    try {
        const dbUrl = process.env.ATLAS_DB_URL;
        if (!dbUrl) {
            throw new Error("ATLAS_DB_URL is missing in your .env file");
        }

        await mongoose.connect(dbUrl);
        console.log("Connected to database...");

        // Update all users who have exactly 0 coins (pre-existing users)
        // We set them to 5.
        const result = await Customer.updateMany(
            { coins: 0 },
            { $set: { coins: 5 } }
        );

        console.log(`Successfully updated ${result.modifiedCount} users with 5 initial coins.`);

        await mongoose.disconnect();
        console.log("Disconnected from database.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

giveInitialCoins();

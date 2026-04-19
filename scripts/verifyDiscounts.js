const mongoose = require("mongoose");
const Item = require("../data/item");
require('dotenv').config();

const dbUrl = process.env.ATLAS_DB_URL;

async function verifyDiscounts() {
    try {
        await mongoose.connect(dbUrl);
        console.log("Connected to Database");

        // 1. Find the "100g neemki" item
        const neemki = await Item.findOne({ name: /neemki/i });
        if (neemki) {
            neemki.price = 20;
            // The item actually has ₹16 green in the user's screenshot.
            // If we set discount to 20%, actualPrice = 20 * 0.8 = 16.
            neemki.discount = 20; 
            await neemki.save();
            console.log("Updated 'neemki': Price 20, Discount 20% -> Actual 16");
        } else {
            console.log("'neemki' item not found");
        }

        // 2. Find a "mobile cover" item
        const cover = await Item.findOne({ name: /mobile cover/i });
        if (cover) {
            cover.price = 100;
            cover.discount = 20; // Actual 80
            await cover.save();
            console.log("Updated 'mobile cover': Price 100, Discount 20% -> Actual 80");
        } else {
            console.log("'mobile cover' item not found");
        }

        console.log("Verification data seeded. Please check the website.");
        process.exit(0);
    } catch (err) {
        console.error("Error seeding verification data:", err);
        process.exit(1);
    }
}

verifyDiscounts();

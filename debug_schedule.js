const mongoose = require('mongoose');
const Shedule = require('./data/clander.js');

// Connect to DB (using the hardcoded string from app.js or similar, or just localhost if I can guess)
// Better to check app.js for connection string first, but usually it's process.env.ATLAS_URL or local.
// I'll try to load .env first.
// Connect to DB - mimicking app.js logic
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const dbUrl = process.env.ATLAS_DB_URL || "mongodb://127.0.0.1:27017/wanderlust";
console.log("Connecting to:", dbUrl);

mongoose.connect(dbUrl)
    .then(async () => {
        console.log("Connected to DB");

        // Check specifically for the ID from the log
        const specificId = "6993bc9ddcde3b739e04548f";
        const specific = await Shedule.findOne({ listingId: specificId });
        console.log("Specific Schedule Query Result:", JSON.stringify(specific, null, 2));

        const schedules = await Shedule.find({});
        console.log(`Found total ${schedules.length} schedules.`);

        mongoose.connection.close();
    })
    .catch(err => {
        console.error("DB Error:", err);
        mongoose.connection.close();
    });

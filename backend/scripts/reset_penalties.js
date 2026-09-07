const mongoose = require("mongoose");
const Customer = require("../data/customers"); // Adjust path if needed
require('dotenv').config({ path: __dirname + '/../.env' }); // Make sure dotenv is loaded

async function resetPenalties() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pasr");
        console.log("Connected to MongoDB.");

        const result = await Customer.updateMany(
            {}, 
            { 
                $set: { 
                    pendingPenalty: 0, 
                    consecutiveCancellations: 0,
                    mandatoryOnlineOrdersCount: 0
                } 
            }
        );

        console.log(`Successfully reset penalties for ${result.modifiedCount} users.`);
    } catch (e) {
        console.error("Error resetting penalties:", e);
    } finally {
        mongoose.connection.close();
    }
}

resetPenalties();

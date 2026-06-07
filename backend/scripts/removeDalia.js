const mongoose = require("mongoose");
const MasterProduct = require("../data/masterProduct");
const Item = require("../data/item");
require("dotenv").config();

async function removeDalia() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        console.log("Connected...");

        // Find Dalia MasterProduct
        const mp = await MasterProduct.findOne({ name: /Dalia/i });
        if (mp) {
            console.log(`Found MasterProduct: ${mp.name}. Deleting...`);
            // Delete items referring to it
            const deletedItems = await Item.deleteMany({ product: mp._id });
            console.log(`Deleted ${deletedItems.deletedCount} items referencing Dalia.`);

            // Delete MasterProduct
            await MasterProduct.deleteOne({ _id: mp._id });
            console.log("Deleted MasterProduct Dalia.");
        } else {
            console.log("No MasterProduct found matching Dalia.");
        }

        // Also delete any standalone/custom items with "Dalia" in the name
        const standaloneDeleted = await Item.deleteMany({ name: /Dalia/i });
        console.log(`Deleted ${standaloneDeleted.deletedCount} standalone items named Dalia.`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

removeDalia();

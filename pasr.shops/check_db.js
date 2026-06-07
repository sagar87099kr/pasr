import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_URL = process.env.ATLAS_DB_URL;
async function run() {
    try {
        await mongoose.connect(DB_URL);
        const shops = await mongoose.connection.collection('shops').find({}).toArray();
        const customers = await mongoose.connection.collection('customers').find({}).toArray();
        console.log("SHOPS_COUNT:", shops.length);
        if (shops.length > 0) {
            console.log("FIRST_SHOP:", {name: shops[0].shopName, owner: shops[0].owner});
        }
        console.log("CUSTOMERS_COUNT:", customers.length);
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
run();

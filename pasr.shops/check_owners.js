import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        const shops = await mongoose.connection.collection('shops').find({}).toArray();
        console.log("Total Shops:", shops.length);
        shops.forEach(shop => {
            console.log(`Shop: ${shop.shopName}, Owner ID: ${shop.owner}`);
        });
        
        const customers = await mongoose.connection.collection('customers').find({ name: 'UMESH' }).toArray();
        console.log("Customers named UMESH:", customers.map(c => ({ id: c._id, username: c.username })));
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
run();

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env' });

const shopSchema = new mongoose.Schema({
    shopName: String,
    verified: Boolean,
    geometry: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    }
}, { collection: 'shops', strict: false });

const Shop = mongoose.models.Shop || mongoose.model('Shop', shopSchema);

async function checkShops() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        const shops = await Shop.find({ verified: true });
        console.log(`Found ${shops.length} verified shops.`);
        shops.forEach(s => {
            console.log(`- ${s.shopName}: ${s.geometry?.coordinates || 'NO COORDS'}`);
        });
    } catch(err) {
        console.error("Fatal Error:", err);
    }
    process.exit(0);
}
checkShops();

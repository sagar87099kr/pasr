import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env' });

const shopSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }]
}, { strict: false, collection: 'shops' });

const customerSchema = new mongoose.Schema({}, { strict: false, collection: 'customers' });
const itemSchema = new mongoose.Schema({}, { strict: false, collection: 'items' });

const Shop = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);

async function testPopulate() {
    await mongoose.connect(process.env.ATLAS_DB_URL);
    try {
        const shop = await Shop.findOne({ verified: true }).populate('owner').populate('items');
        console.log("SUCCESS POPULATING:", shop?._id);
    } catch (e) {
        console.error("POPULATE ERROR:", e);
    }
    process.exit(0);
}
testPopulate();

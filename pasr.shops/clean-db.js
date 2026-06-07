import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env' });

const customerSchema = new mongoose.Schema({
    username: { type: Number, required: true, unique: true },
    hash: String,
    salt: String
}, { collection: 'customers', strict: false });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

async function clean() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        
        console.log("Locating corrupted testing accounts (missing salt/hash)...");
        const corrupted = await Customer.find({ 
            $or: [
                { hash: { $exists: false } },
                { salt: { $exists: false } }
            ]
        });
        
        console.log(`Found ${corrupted.length} corrupted test accounts.`);
        
        for (let user of corrupted) {
            console.log(`Deleting corrupted account: ${user.username}`);
            await Customer.deleteOne({ _id: user._id });
        }
        
        console.log("Cleanup complete! Logins will no longer hang.");
    } catch(err) {
        console.error("Cleanup error:", err);
    }
    process.exit(0);
}
clean();

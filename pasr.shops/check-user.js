import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env' });

async function check() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        const col = mongoose.connection.db.collection('customers');
        const user = await col.findOne({ username: 8252271535 });
        console.log("User Data:");
        console.log(JSON.stringify(user, null, 2));
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}
check();

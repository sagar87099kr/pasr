import dotenv from 'dotenv';
import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

dotenv.config({ path: '.env' });

const customerSchema = new mongoose.Schema({
    username: { type: Number, required: true, unique: true },
    password: { type: String } // explicitly include the old plaintext field 
}, { collection: 'customers', strict: false });

const plm = passportLocalMongoose.default || passportLocalMongoose;
customerSchema.plugin(plm, { usernameField: 'username' });
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

async function test() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        
        // This is one of the users we found earlier with HasHash: false and HasSalt: false
        const user = await Customer.findOne({ username: 8002633507 });
        
        if (!user) {
            console.log("Test user not found in DB.");
            process.exit(1);
        }

        console.log("Found user:", user.username);
        console.log("HasHash:", !!user.hash, "HasSalt:", !!user.salt);
        
        const testPassword = user.password || "123456"; 
        console.log("Testing user.authenticate() with password:", testPassword);
        
        try {
            // Using callback because passport.authenticate('local') inside Express uses the local strategy which uses callbacks!
            await new Promise((resolve) => {
                user.authenticate(testPassword, (err, authedUser, info) => {
                    console.log("Callback Triggered! err:", err ? err.message : null, "user:", !!authedUser, "info:", info);
                    resolve();
                });
            });
        } catch(e) {
            console.error("Synchronous Exception Thrown:", e.message);
        }
        
    } catch(err) {
        console.error("Test error:", err);
    }
    process.exit(0);
}
test();

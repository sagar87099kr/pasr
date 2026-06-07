import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env' });

const customerSchema = new mongoose.Schema({
    username: Number,
    address: String,
    geometry: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    }
}, { collection: 'customers', strict: false });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

async function backfill() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        
        const missingGeo = await Customer.find({ 
            address: { $exists: true, $ne: "" },
            "geometry.coordinates": { $exists: false }
        });
        
        console.log(`Found ${missingGeo.length} customers missing geocodes. Starting backfill...`);
        
        for (let user of missingGeo) {
            try {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(user.address)}&key=${process.env.GOOGLE_MAP_API_KEY}`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.status === "OK" && data.results.length > 0) {
                    const loc = data.results[0].geometry.location;
                    user.geometry = { type: "Point", coordinates: [loc.lng, loc.lat] };
                    await user.save();
                    console.log(`[OK] Geocoded ${user.username}`);
                } else {
                    console.log(`[SKIP] Could not geocode ${user.username}: ${data.status}`);
                }
            } catch (err) {
                console.error(`[ERR] Failed ${user.username}:`, err.message);
            }
            await new Promise(r => setTimeout(r, 200));
        }
        console.log("Backfill complete!");
    } catch(err) {
        console.error("Fatal Error:", err);
    }
    process.exit(0);
}
backfill();

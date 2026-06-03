const mongoose = require('mongoose');
const Bazaar = require('../data/bazaar');
require('dotenv').config({ path: '../.env' }); // Make sure we can connect to DB

const MONGO_URL = process.env.ATLASDB_URL || 'mongodb://127.0.0.1:27017/pasr';

const bazaarsToSeed = [
    { name: 'Doranda', location: 'Giridih', coordinates: [85.9525, 24.3211] }, // rough approx
    { name: 'Balhara', location: 'Giridih', coordinates: [85.9600, 24.3300] },
    { name: 'Ghorthamba', location: 'Giridih', coordinates: [85.9700, 24.3400] },
    { name: 'Khorimahua', location: 'Giridih', coordinates: [85.9800, 24.3500] },
    { name: 'Dhanwar', location: 'Giridih', coordinates: [85.9822, 24.4106] },
    { name: 'Jamua', location: 'Giridih', coordinates: [86.1558, 24.3644] },
    { name: 'Kodambari', location: 'Giridih', coordinates: [86.0000, 24.3800] }
];

async function seedBazaars() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to DB...");

        for (const b of bazaarsToSeed) {
            const existing = await Bazaar.findOne({ name: b.name });
            if (!existing) {
                const newBazaar = new Bazaar({
                    name: b.name,
                    location: b.location,
                    geometry: {
                        type: 'Point',
                        coordinates: b.coordinates
                    },
                    isActive: true
                });
                await newBazaar.save();
                console.log(`Created Bazaar: ${b.name}`);
            } else {
                console.log(`Bazaar ${b.name} already exists.`);
            }
        }
    } catch (e) {
        console.error("Error seeding Bazaars:", e);
    } finally {
        mongoose.disconnect();
        console.log("Disconnected from DB");
    }
}

seedBazaars();

const mongoose = require('mongoose');
require('dotenv').config();
const Shop = require('./data/shops.js');

async function fix() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL, { family: 4 });
        
        const rs = await Shop.findOne({ shopName: /Rockstar/i });
        const san = await Shop.findOne({ shopName: 'सनातनी_FOOD_COURT' });
        
        if (rs && san) {
            san.geometry.coordinates = rs.geometry.coordinates; // Set to Dhanwar
            await san.save();
            console.log("Sanatani location fixed!");
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
fix();

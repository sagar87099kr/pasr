const mongoose = require('mongoose');
require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo');

mongoose.connect(process.env.ATLAS_DB_URL).then(async () => {
    const db = mongoose.connection.db;
    const sessions = await db.collection('sessions').find({}).toArray();
    console.log(`Found ${sessions.length} sessions.`);
    for (const s of sessions) {
        try {
            const data = JSON.parse(s.session);
            if(data.cart && data.cart.items && data.cart.items.length > 0) {
               console.log(`Session ${s._id}: Cart Items:`);
               data.cart.items.forEach(i => {
                   console.log(`- ${i.name} (Shop: ${i.shopName} - ID: ${i.shopId})`);
               });
            }
        } catch(e) {}
    }
    process.exit(0);
});

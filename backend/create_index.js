require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./data/notification');

mongoose.connect(process.env.ATLAS_DB_URL)
    .then(async () => {
        console.log("Connected to DB.");
        await Notification.collection.dropIndex("createdAt_1").catch(() => console.log("Index did not exist"));
        await Notification.collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 2592000 }); // 30 days
        console.log("TTL index created on Notification.createdAt.");
        mongoose.connection.close();
    })
    .catch(err => console.error(err));

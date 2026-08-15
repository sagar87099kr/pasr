require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./data/notification');

mongoose.connect(process.env.ATLAS_DB_URL)
    .then(async () => {
        console.log("Connected to DB.");

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Delete all GENERAL notifications older than 1 day
        const res1 = await Notification.deleteMany({ type: 'GENERAL', createdAt: { $lt: oneDayAgo } });
        console.log(`Deleted ${res1.deletedCount} GENERAL notifications older than 1 day.`);

        // Delete all other notifications older than 7 days
        const res2 = await Notification.deleteMany({ createdAt: { $lt: sevenDaysAgo } });
        console.log(`Deleted ${res2.deletedCount} other notifications older than 7 days.`);

        mongoose.connection.close();
    })
    .catch(err => {
        console.error("DB Connection Error:", err);
    });

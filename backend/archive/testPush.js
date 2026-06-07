require('dotenv').config();
const mongoose = require('mongoose');
const admin = require('./config/firebaseAdmin');
const Customer = require('./data/customers');

const phone = 8252271535;

async function testPush() {
    try {
        const dbUrl = process.env.ATLAS_DB_URL || 'mongodb://127.0.0.1:27017/pasr';
        await mongoose.connect(dbUrl);
        console.log('Connected to DB:', dbUrl.split('@')[1] || dbUrl);

        const customer = await Customer.findOne({ username: phone });
        if (!customer) {
            console.log(`Customer with username ${phone} not found.`);
            return;
        }

        console.log(`Found customer: ${customer.name}`);
        if (!customer.fcmToken) {
            console.log(`Customer ${customer.name} STILL does not have an FCM token. Please check device notification permissions.`);
            return;
        }

        console.log(`Sending FCM to token: ${customer.fcmToken}`);

        const message = {
            notification: {
                title: "Test Push from PASR API",
                body: "Hello! This is a test push notification from your app."
            },
            data: {
                test: "true",
                type: "TEST"
            },
            token: customer.fcmToken
        };

        const response = await admin.messaging().send(message);
        console.log("Successfully sent message:", response);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testPush();

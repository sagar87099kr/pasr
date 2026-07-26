const cron = require('node-cron');
const Customer = require('../data/customers');
const { createNotification } = require('./notificationHelper');

// Scheduled to run every day at 10:00 AM and 8:00 PM (20:00) Indian Standard Time
cron.schedule('0 10,20 * * *', async () => {
    console.log('[Cron] Initiating Scheduled Referral Broadcast...');
    try {
        // Find customers who have a registered Customer App Push Notification Token
        const activeCustomers = await Customer.find({
            $or: [
                { customerFcmToken: { $exists: true, $ne: null } },
                { fcmToken: { $exists: true, $ne: null }, partnerFcmToken: null }
            ]
        });

        const admin = require("firebase-admin");
        let count = 0;
        for (const customer of activeCustomers) {
            const tokenToUse = customer.customerFcmToken || customer.fcmToken;
            if (!tokenToUse) continue;

            // Retrieve referral code or default to their mobile number/username
            const refCode = customer.referralCode || customer.username;
            if (!refCode) continue;

            const title = 'Earn Coins daily! 🚀';
            const body = `Don't forget to share your referral code ${refCode} with friends. You both get 5 coins when they sign up!`;

            // 1. Create Internal Notification
            if (typeof createNotification === 'function') {
                await createNotification(
                    customer._id,
                    'GENERAL',
                    null,
                    title,
                    body
                );
            }

            // 2. Direct FCM Push to Customer App ONLY
            if (admin.apps.length > 0) {
                try {
                    await admin.messaging().send({
                        notification: {
                            title,
                            body
                        },
                        data: {
                            title,
                            body,
                            type: 'REFERRAL_REMINDER'
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                sound: 'default',
                                defaultSound: true,
                                priority: 'high',
                                channelId: 'pasr_user_notifications'
                            }
                        },
                        apns: {
                            payload: {
                                aps: { sound: 'default' }
                            }
                        },
                        token: tokenToUse
                    });
                    count++;
                } catch (fcmErr) {
                    console.error(`[Cron] Error sending FCM to ${customer._id}:`, fcmErr);
                }
            }
        }
        console.log(`[Cron] Successfully broadcasted Referral Code reminder to ${count} user app devices.`);
    } catch (e) {
        console.error('[Cron] Error broadcasting Referral Code reminders:', e);
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

console.log('[Cron] Referral Notification Jobs initialized (10 AM & 8 PM IST).');

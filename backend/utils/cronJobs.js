const cron = require('node-cron');
const Customer = require('../data/customers');
const Order = require('../data/order');
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

            // Note: We intentionally DO NOT create an internal database Notification here
            // because running this twice daily for all users would flood the database with thousands of records.
            // We only send the direct FCM Push.

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

// Post-Delivery Review Request
// Runs every 15 minutes to find orders completed ~1 hour ago
cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Checking for Post-Delivery Review Requests...');
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hour window to catch any misses

        const recentCompletedOrders = await Order.find({
            orderStatus: 'COMPLETED',
            deliveredAt: { $lte: oneHourAgo, $gte: twoHoursAgo },
            reviewNotificationSent: { $ne: true },
            deliveryPartnerId: { $exists: true },
            customerId: { $exists: true }
        }).populate('customerId').populate('deliveryPartnerId');

        const admin = require("firebase-admin");
        let count = 0;

        for (const order of recentCompletedOrders) {
            const customer = order.customerId;
            const partner = order.deliveryPartnerId;

            if (!customer || !partner) continue;

            const tokenToUse = customer.customerFcmToken || customer.fcmToken;
            if (!tokenToUse) continue;

            const title = 'How was your delivery? ⭐';
            const body = `How was your delivery with ${partner.name}? Tap here to rate them and the shop!`;

            if (admin.apps.length > 0) {
                try {
                    await admin.messaging().send({
                        notification: { title, body },
                        data: {
                            title,
                            body,
                            type: 'RATE_ORDER',
                            orderId: String(order._id)
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
                    
                    // Mark as sent
                    order.reviewNotificationSent = true;
                    await order.save();
                    count++;
                } catch (fcmErr) {
                    console.error(`[Cron] Error sending Review Request FCM to ${customer._id}:`, fcmErr);
                }
            }
        }
        if (count > 0) console.log(`[Cron] Sent ${count} Post-Delivery Review Requests.`);
    } catch (e) {
        console.error('[Cron] Error processing Post-Delivery Review Requests:', e);
    }
});

console.log('[Cron] Review Notification Job initialized (Every 15 mins).');

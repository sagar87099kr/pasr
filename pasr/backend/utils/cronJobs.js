const cron = require('node-cron');
const Customer = require('../data/customers');
const { createNotification } = require('./notificationHelper');

// Scheduled to run every day at 10:00 AM and 8:00 PM (20:00) Indian Standard Time
cron.schedule('0 10,20 * * *', async () => {
    console.log('[Cron] Initiating Scheduled Referral Broadcast...');
    try {
        // Find customers who have a registered Push Notification Token
        const activeCustomers = await Customer.find({ fcmToken: { $exists: true, $ne: null } });

        let count = 0;
        for (const customer of activeCustomers) {
            // Retrieve referral code or default to their mobile number/username
            const refCode = customer.referralCode || customer.username;
            if (!refCode) continue;

            // Dispatch Push Notification
            if (typeof createNotification === 'function') {
                await createNotification(
                    customer._id,
                    'GENERAL',
                    null,
                    'Earn Coins daily! 🚀',
                    `Don't forget to share your referral code ${refCode} with friends. You both get 5 coins when they sign up!`
                );
                count++;
            }
        }
        console.log(`[Cron] Successfully broadcasted Referral Code reminder to ${count} customers.`);
    } catch (e) {
        console.error('[Cron] Error broadcasting Referral Code reminders:', e);
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

console.log('[Cron] Referral Notification Jobs initialized (10 AM & 8 PM IST).');

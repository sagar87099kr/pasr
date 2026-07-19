const Notification = require("../data/notification");

/**
 * Creates a notification for a user.
 * @param {string} recipientId - The ID of the Customer receiving the notification.
 * @param {string} type - 'ORDER_RECEIVED' or 'ORDER_STATUS_UPDATE'.
 * @param {string} orderId - The Order _id (optional).
 * @param {string} title - Short title for the notification.
 * @param {string} message - Detailed message.
 * @param {string} imageUrl - Optional image URL to display in FCM push.
 */
const createNotification = async (recipientId, type, orderId, title, message, imageUrl = null) => {
    try {
        const notification = new Notification({
            recipient: recipientId,
            type,
            orderId,
            title,
            message
        });
        await notification.save();
        console.log(`Notification created for user ${recipientId}: ${title}`);

        // Dispatch FCM Push Notification
        const Customer = require("../data/customers");
        const customer = await Customer.findById(recipientId);
        if (customer && customer.fcmToken) {
            const admin = require("firebase-admin");
            if (admin.apps.length > 0) {
                const payload = {
                    notification: {
                        title: String(title || ''),
                        body: String(message || '')
                    },
                    data: {
                        title: String(title || ''),
                        body: String(message || ''),
                        orderId: String(orderId || ''),
                        type: String(type || '')
                    },
                    android: {
                        priority: "high",
                        notification: {
                            priority: "high",
                            defaultSound: true,
                            defaultVibrateTimings: true
                        }
                    },
                    apns: {
                        payload: {
                            aps: {
                                contentAvailable: true,
                                sound: "default"
                            }
                        }
                    },
                    token: customer.fcmToken
                };

                if (imageUrl) {
                    payload.data.image = String(imageUrl);
                }
                try {
                    await admin.messaging().send(payload);
                    console.log(`FCM Push Sent to ${recipientId}`);
                } catch (fcmErr) {
                    console.error(`Failed to send FCM to ${recipientId}:`, fcmErr);
                }
            } else {
                console.log(`Firebase not initialized. Skipped FCM Push to ${recipientId}`);
            }
        }

        return notification;
    } catch (e) {
        console.error("Failed to create notification:", e);
    }
};

module.exports = { createNotification };

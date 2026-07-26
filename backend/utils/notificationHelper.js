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
        
        let tokenToUse = null;
        let tokenType = null;
        if (customer) {
            // Determine which token to use based on the notification type
            const isPartnerEvent = ['ORDER_RECEIVED', 'ORDER_CANCELLED_BY_CUSTOMER', 'PAYMENT_VERIFIED'].includes(type);
            
            if (isPartnerEvent) {
                tokenToUse = customer.partnerFcmToken || customer.fcmToken;
                tokenType = customer.partnerFcmToken ? 'partnerFcmToken' : 'fcmToken';
            } else {
                tokenToUse = customer.customerFcmToken || customer.fcmToken;
                tokenType = customer.customerFcmToken ? 'customerFcmToken' : 'fcmToken';
            }
        }
        
        if (customer && tokenToUse) {
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
                        priority: 'high',
                        notification: {
                            channelId: 'pasr_orders',
                            sound: 'default',
                            defaultSound: true,
                            defaultVibrateTimings: true,
                        }
                    },
                    apns: {
                        payload: {
                            aps: { sound: 'default' }
                        }
                    },
                    token: tokenToUse
                };

                if (imageUrl) {
                    payload.data.image = String(imageUrl);
                }
                try {
                    await admin.messaging().send(payload);
                    console.log(`FCM Push Sent to ${recipientId}`);
                } catch (fcmErr) {
                    console.error(`Failed to send FCM to ${recipientId}:`, fcmErr.message);
                    if (fcmErr.code === 'messaging/mismatched-credential' || fcmErr.code === 'messaging/registration-token-not-registered' || fcmErr.code === 'messaging/invalid-registration-token') {
                        if (tokenType && customer) {
                            const updateObj = {};
                            updateObj[tokenType] = null;
                            await Customer.findByIdAndUpdate(customer._id, { $set: updateObj });
                            console.log(`Cleared invalid/mismatched ${tokenType} for customer ${customer._id}`);
                        }
                    }
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

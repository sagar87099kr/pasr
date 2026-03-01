const Notification = require("../data/notification");

/**
 * Creates a notification for a user.
 * @param {string} recipientId - The ID of the Customer receiving the notification.
 * @param {string} type - 'ORDER_RECEIVED' or 'ORDER_STATUS_UPDATE'.
 * @param {string} orderId - The Order _id (optional).
 * @param {string} title - Short title for the notification.
 * @param {string} message - Detailed message.
 */
const createNotification = async (recipientId, type, orderId, title, message) => {
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
        return notification;
    } catch (e) {
        console.error("Failed to create notification:", e);
    }
};

module.exports = { createNotification };

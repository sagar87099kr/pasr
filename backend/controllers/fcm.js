const Customer = require("../data/customers");
const Shop = require("../data/shops");

module.exports.saveCustomerToken = async (req, res) => {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ success: false, message: "Token is required" });

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
        console.warn(`[FCM] Invalid user ID for saving token: ${req.user._id}`);
        return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const customer = await Customer.findById(req.user._id);
    const isNewSubscription = !customer || (!customer.customerFcmToken && !customer.fcmToken);

    // Remove this token from any other accounts first to prevent cross-account notifications
    await Customer.updateMany(
        { _id: { $ne: req.user._id }, $or: [{ customerFcmToken: fcmToken }, { fcmToken: fcmToken }] },
        { $set: { customerFcmToken: null, fcmToken: null } }
    );

    await Customer.findByIdAndUpdate(req.user._id, { customerFcmToken: fcmToken, fcmToken });

    // Send Welcome Push Notification only once
    if (isNewSubscription) {
        const { createNotification } = require("../utils/notificationHelper");
        if (typeof createNotification === 'function') {
            await createNotification(
                req.user._id,
                'GENERAL',
                null,
                'Welcome to notifications!',
                'You will now receive instant push alerts about your orders.'
            );
        }
    }

    res.status(200).json({ success: true, message: "Customer token saved" });
};

module.exports.saveShopToken = async (req, res) => {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ success: false, message: "Token is required" });

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
        console.warn(`[FCM] Invalid user ID for shop owner token: ${req.user._id}`);
        return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const customer = await Customer.findById(req.user._id);
    const isNewSubscription = !customer || (!customer.partnerFcmToken);

    // Remove this token from any other accounts first to prevent cross-account notifications
    await Customer.updateMany(
        { _id: { $ne: req.user._id }, partnerFcmToken: fcmToken },
        { $set: { partnerFcmToken: null } }
    );

    // Save token as partnerFcmToken for the Customer who owns the shop
    await Customer.findByIdAndUpdate(req.user._id, { partnerFcmToken: fcmToken });

    // Send Welcome Push Notification only once
    if (isNewSubscription) {
        const { createNotification } = require("../utils/notificationHelper");
        if (typeof createNotification === 'function') {
            await createNotification(
                req.user._id,
                'GENERAL',
                null,
                'Push Alerts Enabled',
                'Awesome! You will now receive instant shop order alerts.'
            );
        }
    }

    res.status(200).json({ success: true, message: "Shop owner token saved" });
};

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

    await Customer.findByIdAndUpdate(req.user._id, { fcmToken });
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

    // Assuming we update the token for the Customer who owns the shop
    await Customer.findByIdAndUpdate(req.user._id, { fcmToken });
    res.status(200).json({ success: true, message: "Shop owner token saved" });
};

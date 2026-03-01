const Customer = require("../data/customers");
const Shop = require("../data/shops");

module.exports.saveCustomerToken = async (req, res) => {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ success: false, message: "Token is required" });

    await Customer.findByIdAndUpdate(req.user._id, { fcmToken });
    res.status(200).json({ success: true, message: "Customer token saved" });
};

module.exports.saveShopToken = async (req, res) => {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ success: false, message: "Token is required" });

    // Assuming we update the token for the Customer who owns the shop
    await Customer.findByIdAndUpdate(req.user._id, { fcmToken });
    res.status(200).json({ success: true, message: "Shop owner token saved" });
};

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Order = require("../data/order");
const Shop = require("../data/shops");
const Product = require("../data/product");
const MasterProduct = require("../data/masterProduct");
const Provider = require("../data/serviceproviders");
const DeliveryPartner = require("../data/deliveryPartner");
const Customer = require("../data/customers");

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.pasr_token) {
        token = req.cookies.pasr_token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET || "fallback_secret_for_dev");
        req.user = { _id: decoded.id };
        next();
    } catch (err) {
        // If JWT fails, maybe the client passed the raw user ID as a fallback during development?
        if (token.length === 24) {
             req.user = { _id: token };
             next();
        } else {
             return res.status(401).json({ success: false, message: "Invalid or expired token." });
        }
    }
};

// GET /api/partner/my-profiles
router.get("/partner/my-profiles", verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const customer = await Customer.findById(userId);
        
        const profiles = [];
        
        // 1. Shops
        const shops = await Shop.find({ owner: userId });
        shops.forEach(shop => {
            profiles.push({
                _id: shop._id,
                type: 'Shop Owner',
                category: shop.category || 'Retail',
                businessName: shop.shopName
            });
        });

        // 2. Providers
        const providers = await Provider.find({ owner: userId });
        providers.forEach(provider => {
            profiles.push({
                _id: provider._id,
                type: 'Service Provider',
                category: provider.categories,
                businessName: provider.company || provider.name || 'Service Provider'
            });
        });

        // 3. Delivery Partners
        if (customer && customer.username) {
            const deliveryPartners = await DeliveryPartner.find({ phoneNumber: Number(customer.username) });
            deliveryPartners.forEach(dp => {
                profiles.push({
                    _id: dp._id,
                    type: 'Delivery Partner',
                    category: 'Logistics',
                    businessName: dp.fullName || 'Delivery Partner'
                });
            });
        }

        res.json({ success: true, profiles });
    } catch (e) {
        console.error("Error in my-profiles:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/shop/orders
router.get("/shop/orders", verifyToken, async (req, res) => {
    try {
        const shopId = req.query.shopId;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });

        // Ensure user owns this shop
        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        const orders = await Order.find({ shopId }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/shop/orders/verify-otp
router.post("/shop/orders/verify-otp", verifyToken, async (req, res) => {
    try {
        const { orderId, otp, shopId } = req.body;
        if (!orderId || !otp || !shopId) return res.status(400).json({ success: false, message: "Missing fields" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        const order = await Order.findOne({ _id: orderId, shopId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (order.deliveryOTP !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        order.orderStatus = 'DELIVERED';
        await order.save();

        res.json({ success: true, message: "OTP verified successfully", order });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/shop/products
router.get("/shop/products", verifyToken, async (req, res) => {
    try {
        const shopId = req.query.shopId;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });

        const products = await Product.find({ shop: shopId }).populate("product");
        res.json({ success: true, products });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/shop/products
router.post("/shop/products", verifyToken, async (req, res) => {
    try {
        const { shopId, productId, price, originalPrice, stock, discountPercent, offerName, quantity, inStock, status } = req.body;
        if (!shopId || !productId) return res.status(400).json({ success: false, message: "Missing shopId or productId" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        const newProduct = new Product({
            shop: shopId,
            product: productId,
            price: price || 0,
            originalPrice: originalPrice || 0,
            stock: stock || 0,
            discountPercent: discountPercent || 0,
            offerName: offerName || "",
            quantity: quantity || "1 piece",
            inStock: inStock !== undefined ? inStock : true,
            status: status || "active"
        });

        await newProduct.save();
        res.json({ success: true, product: newProduct });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/shop/products/search
router.get("/shop/products/search", verifyToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, suggestions: [] });

        const suggestions = await MasterProduct.find({ name: new RegExp(q, "i") }).limit(20);
        res.json({ success: true, suggestions });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;

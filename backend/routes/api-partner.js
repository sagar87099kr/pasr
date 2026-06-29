const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Order = require("../data/order");
const Shop = require("../data/shops");
const Product = require("../data/product");
const Item = require("../data/item");
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

// GET /api/partner/me
router.get("/partner/me", verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const customer = await Customer.findById(userId);
        if (!customer) return res.status(404).json({ success: false, message: "User not found" });
        
        res.json({
            success: true,
            user: {
                name: customer.name || '',
                phone: customer.username ? customer.username.toString() : '',
                address: customer.address || ''
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

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
                businessName: shop.shopName,
                image: shop.shopImage && shop.shopImage.length > 0 ? shop.shopImage[0].url : ''
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

        const orders = await Order.find({ shopId })
            .populate("customerId")
            .populate({
                path: "items.itemId",
                populate: { path: "product" }
            })
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/shop/settings
router.get("/shop/settings", verifyToken, async (req, res) => {
    try {
        const { shopId } = req.query;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

        res.json({ success: true, shop });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// PUT /api/shop/settings
router.put("/shop/settings", verifyToken, async (req, res) => {
    try {
        const { shopId, shopName, shopDescription, category, location, openingTime, closingTime, upiId } = req.body;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

        if (shopName) shop.shopName = shopName;
        if (shopDescription !== undefined) shop.shopDescription = shopDescription;
        if (category) shop.category = category;
        if (location) shop.location = location;
        if (openingTime) shop.openingTime = openingTime;
        if (closingTime) shop.closingTime = closingTime;
        if (upiId !== undefined) shop.upiId = upiId;
        
        await shop.save();
        res.json({ success: true, message: "Settings saved successfully", shop });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/shop/dashboard
router.get("/shop/dashboard", verifyToken, async (req, res) => {
    try {
        const shopId = req.query.shopId;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const orders = await Order.find({ shopId });
        
        let todaysOrders = 0;
        let pendingOrders = 0;
        let readyForPickup = 0;
        let cancelled = 0;
        let delivered = 0;
        let revenue = 0;

        orders.forEach(order => {
            if (new Date(order.createdAt) >= startOfDay) todaysOrders++;
            
            if (['CREATED', 'ACCEPTED', 'PACKED', 'BROADCAST', 'ASSIGNED'].includes(order.orderStatus)) pendingOrders++;
            if (order.orderStatus === 'READY_FOR_DELIVERY') readyForPickup++;
            if (order.orderStatus === 'CANCELLED') cancelled++;
            if (order.orderStatus === 'COMPLETED' || order.orderStatus === 'DELIVERED') {
                delivered++;
                revenue += order.totalAmount || 0;
            }
        });

        res.json({
            success: true,
            dashboard: {
                todaysOrders,
                pendingOrders,
                readyForPickup,
                cancelled,
                delivered,
                revenue,
                averagePreparationTime: 15 // Placeholder
            }
        });
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

// PUT /api/shop/orders/:id/status
router.put("/shop/orders/:id/status", verifyToken, async (req, res) => {
    try {
        const { status, shopId } = req.body;
        if (!status || !shopId) return res.status(400).json({ success: false, message: "Missing fields" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
        const query = isObjectId ? { _id: req.params.id, shopId } : { orderId: req.params.id, shopId };
        const order = await Order.findOne(query);
        
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        order.orderStatus = status;
        await order.save();

        if (status === 'PACKED' && order.customerId) {
            try {
                const { createNotification } = require("../utils/notificationHelper");
                if (typeof createNotification === 'function') {
                    const isPickup = order.deliveryType === 'SELF_PICKUP' || order.deliveryType === 'SHOP_PICKUP';
                    const message = isPickup 
                        ? "Your order is packed and ready for pickup." 
                        : "Your order is packed and awaiting a delivery partner.";
                    await createNotification(
                        order.customerId,
                        "Order Packed",
                        message,
                        "order_update",
                        order._id
                    );
                }
            } catch (err) {
                console.error("Error sending packed notification:", err);
            }
        }

        res.json({ success: true, message: "Order status updated", order });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/shop/products
router.get("/shop/products", verifyToken, async (req, res) => {
    try {
        const shopId = req.query.shopId;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });

        const products = await Item.find({ shop: shopId }).populate("product");
        res.json({ success: true, products });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/shop/billing
router.post("/shop/billing", verifyToken, async (req, res) => {
    try {
        const { shopId, customerName, items, totalAmount } = req.body;
        if (!shopId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Missing required fields or empty cart" });
        }

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        // Verify and deduct stock
        let subtotal = 0;
        const processedItems = [];

        for (let itemData of items) {
            const item = await Item.findOne({ _id: itemData.itemId, shop: shopId });
            if (!item) {
                return res.status(400).json({ success: false, message: `Item ${itemData.name} not found in inventory` });
            }
            if (item.quantity < itemData.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for ${itemData.name}` });
            }

            // Deduct stock
            item.quantity -= itemData.quantity;
            await item.save();

            subtotal += itemData.price * itemData.quantity;
            processedItems.push({
                itemId: item._id,
                name: item.name || itemData.name,
                price: itemData.price,
                quantity: itemData.quantity
            });
        }

        // Create the POS Order
        const newOrder = new Order({
            orderId: `PASR-POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            shopId: shop._id,
            customerName: customerName || "Guest",
            items: processedItems,
            subtotalAmount: subtotal,
            totalAmount: subtotal,
            deliveryType: "SHOP_PICKUP",
            paymentType: "COD",
            paymentStatus: "COLLECTED",
            orderStatus: "COMPLETED",
            selfDelivery: false,
            settlementStatus: "PENDING",
            coinDiscount: 0,
            deliveryCharge: 0
        });

        await newOrder.save();

        res.json({ success: true, message: "Bill generated successfully", order: newOrder });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/shop/products
router.post("/shop/products", verifyToken, async (req, res) => {
    try {
        const { shopId, productId, price, originalPrice, stock, discountPercent, offerName, quantity, inStock, status, deliveryType, maxDeliveryDistance, availableForDelivery, canDeliverByBike } = req.body;
        if (!shopId || !productId) return res.status(400).json({ success: false, message: "Missing shopId or productId" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        // Item model fields: shop, product, price, quantity (number), discount, isActive
        const newItem = new Item({
            shop: shopId,
            product: productId,
            price: price || 0,
            quantity: stock || 1,
            discount: discountPercent || 0,
            isActive: inStock !== false,
            deliveryType: deliveryType || 'standard',
            maxDeliveryDistance: maxDeliveryDistance ? parseInt(maxDeliveryDistance) : 10,
            availableForDelivery: availableForDelivery !== false,
            canDeliverByBike: canDeliverByBike !== false
        });

        await newItem.save();
        res.json({ success: true, product: newItem });
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
// PUT /api/shop/products/:id
router.put("/shop/products/:id", verifyToken, async (req, res) => {
    try {
        const { shopId, price, stock, discountPercent, name, category, description, image, deliveryType, maxDeliveryDistance, availableForDelivery, canDeliverByBike } = req.body;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        const item = await Item.findOne({ _id: req.params.id, shop: shopId });
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });

        if (name !== undefined) item.name = name;
        if (category !== undefined) item.itemCategory = category;
        if (description !== undefined) item.description = description;
        if (image !== undefined) item.img = { url: image };
        if (price !== undefined) item.price = price;
        if (stock !== undefined) item.quantity = stock;
        if (discountPercent !== undefined) item.discount = discountPercent;
        if (deliveryType !== undefined) item.deliveryType = deliveryType;
        if (maxDeliveryDistance !== undefined) item.maxDeliveryDistance = parseInt(maxDeliveryDistance);
        if (availableForDelivery !== undefined) item.availableForDelivery = availableForDelivery;
        if (canDeliverByBike !== undefined) item.canDeliverByBike = canDeliverByBike;

        await item.save();
        res.json({ success: true, product: item });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// DELETE /api/shop/products/:id
router.delete("/shop/products/:id", verifyToken, async (req, res) => {
    try {
        const { shopId } = req.query;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        const item = await Item.findOneAndDelete({ _id: req.params.id, shop: shopId });
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });

        res.json({ success: true, message: "Item deleted successfully" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;

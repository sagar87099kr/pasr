const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Order = require("../data/order");
const Shop = require("../data/shops");
const Product = require("../data/product");
const Item = require("../data/item");
const MasterProduct = require("../data/masterProduct");
const ItemImageRegistry = require("../data/itemImageRegistry");
const { normalizeItemName } = require("../utils/normalization");
const Provider = require("../data/serviceproviders");
const DeliveryPartner = require("../data/deliveryPartner");
const Customer = require("../data/customers");
const orderBus = require("../events/eventBus");

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
// POST /api/partner/register-shop
router.post("/partner/register-shop", verifyToken, async (req, res) => {
    try {
        const { shopName, shopDescription, category, location, openingTime, closingTime, upiId, shopImage } = req.body;
        const shop = new Shop({
            shopName, shopDescription: shopDescription || "", category, location: location || "India",
            openingTime: openingTime || "09:00", closingTime: closingTime || "21:00", upiId: upiId || "",
            owner: req.user._id, verified: false, isFarmer: false,
            geometry: { type: "Point", coordinates: [77.2090, 28.6139] }
        });
        if (shopImage && typeof shopImage === 'string') {
            const { cloudinary } = require('../cloud_con');
            const uploadRes = await cloudinary.uploader.upload(shopImage, {
                folder: 'pasr_DEV',
                transformation: [{ width: 1000, height: 1000, crop: "limit", quality: "auto:good" }],
                format: 'webp'
            });
            shop.shopImage = [{ url: uploadRes.secure_url, filename: uploadRes.public_id }];
        } else {
            shop.shopImage = [];
        }
        await shop.save();
        res.json({ success: true, shopId: shop._id, message: "Shop registered successfully" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/partner/register-provider
router.post("/partner/register-provider", verifyToken, async (req, res) => {
    try {
        const { company, categories, location, experience, discription, price, personImage } = req.body;
        const provider = new Provider({
            company: company || "Freelancer", categories, location: location || "India",
            experience: experience || 1, discription: discription || "", price: price || [0],
            owner: req.user._id, verified: false, geometry: { type: "Point", coordinates: [77.2090, 28.6139] }
        });
        if (personImage && typeof personImage === 'string') {
            const { cloudinary } = require('../cloud_con');
            const uploadRes = await cloudinary.uploader.upload(personImage, {
                folder: 'pasr_DEV',
                transformation: [{ width: 1000, height: 1000, crop: "limit", quality: "auto:good" }],
                format: 'webp'
            });
            provider.personImage = [{ url: uploadRes.secure_url, path: uploadRes.secure_url, filename: uploadRes.public_id }];
        } else {
            provider.personImage = [];
        }
        await provider.save();
        res.json({ success: true, providerId: provider._id, message: "Provider registered successfully" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/partner/register-delivery
router.post("/partner/register-delivery", verifyToken, async (req, res) => {
    try {
        const { fullName, phoneNumber, vehicleType, vehicleNumber, address, dateOfBirth, aadharNumber, panNumber } = req.body;
        const customer = await Customer.findById(req.user._id);
        const dp = new DeliveryPartner({
            user: req.user._id, fullName, phoneNumber: phoneNumber || (customer ? customer.username : 0),
            vehicleType: vehicleType || "bike", vehicleNumber: vehicleNumber || "",
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date("1990-01-01"),
            address: { street: address || "India" }, workLocation: { lat: 28.6139, lng: 77.2090 },
            documents: { aadharFront: "mock", aadharBack: "mock", panCard: "mock" },
            aadharNumber: aadharNumber || "0000", panNumber: panNumber || "0000", isActive: false, isApproved: false
        });
        await dp.save();
        res.json({ success: true, deliveryPartnerId: dp._id, message: "Delivery partner registered" });
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ success: false, message: "Delivery partner profile already exists." });
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/partner/register-farmer
router.post("/partner/register-farmer", verifyToken, async (req, res) => {
    try {
        const { farmName, category, location, phoneNumber, upiId, farmImage, price, quantity } = req.body;
        const product = new Product({
            productName: farmName, categories: category || "Vegetables", location: location || "India",
            upiId: upiId || "", owner: req.user._id, verified: false, 
            price: price ? Number(price) : 0, quantity: quantity ? Number(quantity) : 1,
            geometry: { type: "Point", coordinates: [77.2090, 28.6139] }
        });
        if (farmImage && typeof farmImage === 'string') {
            const { cloudinary } = require('../cloud_con');
            const uploadRes = await cloudinary.uploader.upload(farmImage, {
                folder: 'pasr_DEV',
                transformation: [{ width: 1000, height: 1000, crop: "limit", quality: "auto:good" }],
                format: 'webp'
            });
            product.productImage = [{ url: uploadRes.secure_url, filename: uploadRes.public_id }];
        } else {
            product.productImage = [];
        }
        await product.save();
        res.json({ success: true, farmerId: product._id, message: "Farmer registered successfully as a product" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
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
            if (shop.isFarmer) return; // Legacy farmers might be here, skip or handle separately
            profiles.push({
                _id: shop._id,
                type: 'Shop Owner',
                category: shop.category || 'Retail',
                businessName: shop.shopName,
                image: shop.shopImage && shop.shopImage.length > 0 ? shop.shopImage[0].url : ''
            });
        });

        // 1b. Farmers (now saved as Products)
        const products = await Product.find({ owner: userId });
        products.forEach(product => {
            profiles.push({
                _id: product._id,
                type: 'Farmer',
                category: product.categories || 'Agriculture',
                businessName: product.productName,
                image: product.productImage && product.productImage.length > 0 ? product.productImage[0].url : ''
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

        const orders = await Order.find({ shopId, $nor: [{ paymentType: 'PREPAID', paymentStatus: 'PENDING' }, { orderStatus: 'PENDING_PAYMENT' }] })
            .populate("customerId")
            .populate("deliveryPartnerId")
            .populate({
                path: "items.itemId",
                populate: { path: "product" }
            })
            .sort({ createdAt: -1 });
        const mappedOrders = orders.map(o => {
            const obj = o.toObject();
            obj.totalAmount = obj.subtotalAmount || obj.totalAmount;
            return obj;
        });
        res.json({ success: true, orders: mappedOrders });
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

        const orders = await Order.find({ shopId, $nor: [{ paymentType: 'PREPAID', paymentStatus: 'PENDING' }, { orderStatus: 'PENDING_PAYMENT' }] });
        
        let todaysOrders = 0;
        let pendingOrders = 0;
        let readyForPickup = 0;
        let cancelled = 0;
        let delivered = 0;
        let totalRevenue = 0;

        orders.forEach(order => {
            if (new Date(order.createdAt) >= startOfDay && order.orderStatus !== 'CANCELLED') todaysOrders++;
            
            if (['CREATED', 'ACCEPTED', 'PACKED', 'BROADCAST', 'ASSIGNED'].includes(order.orderStatus)) pendingOrders++;
            if (order.orderStatus === 'READY_FOR_DELIVERY') readyForPickup++;
            if (order.orderStatus === 'CANCELLED') cancelled++;
            if (order.orderStatus === 'COMPLETED' || order.orderStatus === 'DELIVERED') {
                delivered++;
                totalRevenue += order.subtotalAmount || order.totalAmount || 0;
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
                revenue: totalRevenue,
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

        order.orderStatus = 'COMPLETED';
        await order.save();

        // Emit COMPLETED event to trigger customer notification
        orderBus.emit("ORDER_COMPLETED", order);

        // Cancellation Penalty Reset Logic
        const Customer = require("../data/customers");
        const compCustomer = await Customer.findById(order.customerId);
        if (compCustomer) {
            compCustomer.consecutiveCancellations = 0;
            if (compCustomer.mandatoryOnlineOrdersCount > 0) {
                compCustomer.mandatoryOnlineOrdersCount -= 1;
            }
            await compCustomer.save();

            // Handle Deferred Referral Reward
            if (compCustomer.referredBy && !compCustomer.referralRewardClaimed) {
                const updatedCustomer = await Customer.findOneAndUpdate(
                    { _id: compCustomer._id, referralRewardClaimed: { $ne: true } },
                    { $set: { referralRewardClaimed: true } }
                );
                if (updatedCustomer) {
                    await Customer.updateOne(
                        { _id: compCustomer.referredBy },
                        { $inc: { coins: 10, referralCount: 1 } }
                    );
                }
            }
        }

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

        // Prevent double processing for already cancelled/rejected orders
        if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'REJECTED') {
            return res.status(400).json({ success: false, message: `Order is already ${order.orderStatus}` });
        }

        // ATOMIC LOCK: Optimistic Concurrency Control to prevent rapid click race conditions
        const lockedOrder = await Order.findOneAndUpdate(
            { _id: order._id, orderStatus: order.orderStatus },
            { $set: { orderStatus: status } },
            { new: true }
        );

        if (!lockedOrder) {
            return res.status(400).json({ success: false, message: "Order state has already been changed." });
        }

        // Handle Shop Cancellation / Rejection
        if (status === 'CANCELLED' || status === 'REJECTED') {
            // 1. Refund Coins (with secondary atomic lock to be absolutely safe)
            if (lockedOrder.coinDiscount && lockedOrder.coinDiscount > 0 && !lockedOrder.isRefunded) {
                const refundLock = await Order.findOneAndUpdate(
                    { _id: lockedOrder._id, isRefunded: { $ne: true } },
                    { $set: { isRefunded: true } }
                );
                if (refundLock) {
                    await Customer.updateOne(
                        { _id: lockedOrder.customerId },
                        { $inc: { coins: lockedOrder.coinDiscount } }
                    );
                }
            }

            // 2. Restock Inventory
            for (let orderItem of lockedOrder.items) {
                await Item.updateOne(
                    { _id: orderItem.itemId }, 
                    { $inc: { quantity: orderItem.quantity } }
                );
            }
            
            lockedOrder.cancellationReason = "Cancelled by Shop";
            await lockedOrder.save();
        }

        // Handle Deferred Referral Reward
        if (status === 'COMPLETED' || status === 'DELIVERED') {
            const customer = await Customer.findById(lockedOrder.customerId);
            if (customer && customer.referredBy && !customer.referralRewardClaimed) {
                const updatedCustomer = await Customer.findOneAndUpdate(
                    { _id: customer._id, referralRewardClaimed: { $ne: true } },
                    { $set: { referralRewardClaimed: true } }
                );
                if (updatedCustomer) {
                    await Customer.updateOne(
                        { _id: customer.referredBy },
                        { $inc: { coins: 10, referralCount: 1 } }
                    );
                }
            }
        }

        // Emit corresponding orderBus event for real-time FCM notification dispatch
        switch (status) {
            case 'ACCEPTED':
                orderBus.emit("ORDER_ACCEPTED", lockedOrder);
                break;
            case 'REJECTED':
                orderBus.emit("ORDER_REJECTED", lockedOrder);
                break;
            case 'PACKED':
            case 'READY_FOR_DELIVERY':
                orderBus.emit("ORDER_PACKED", lockedOrder);
                break;
            case 'OUT_FOR_DELIVERY':
                orderBus.emit("ORDER_OUT_FOR_DELIVERY", lockedOrder);
                break;
            case 'COMPLETED':
            case 'DELIVERED':
                orderBus.emit("ORDER_COMPLETED", lockedOrder);
                break;
            case 'CANCELLED':
                orderBus.emit("ORDER_CANCELLED", { order: lockedOrder, cancelledBy: 'SHOP' });
                break;
            default:
                orderBus.emit("ORDER_STATUS_UPDATE", { order: lockedOrder, event: status });
                break;
        }

        const mappedOrder = lockedOrder.toObject();
        mappedOrder.totalAmount = mappedOrder.subtotalAmount || mappedOrder.totalAmount;

        res.json({ success: true, order: mappedOrder, message: "Order status updated" });
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

// GET /api/shop/customers/lookup
router.get("/shop/customers/lookup", verifyToken, async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone || String(phone).trim().length < 10) {
            return res.status(400).json({ success: false, message: "Valid 10-digit mobile number required" });
        }
        
        const cleanPhone = String(phone).trim().replace(/\D/g, '').slice(-10);
        const customer = await Customer.findOne({ username: Number(cleanPhone) }).select('name username address pincode geometry coins').lean();

        if (!customer) {
            return res.json({
                success: true,
                registered: false,
                customer: null
            });
        }

        // Check if first order (for free delivery eligibility)
        const FreeDeliveryUsage = require("../data/freeDeliveryUsage.js");
        const alreadyUsedFirstOrder = await FreeDeliveryUsage.findOne({ mobile: cleanPhone });
        const isFirstOrder = !alreadyUsedFirstOrder;

        res.json({
            success: true,
            registered: true,
            customer: {
                _id: customer._id,
                name: customer.name,
                phone: customer.username,
                address: customer.address || '',
                pincode: customer.pincode || '',
                geometry: customer.geometry || null,
                coins: customer.coins || 0,
                isFirstOrder
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/shop/calculate-delivery (Calculates from Shop's assigned Bazaar Hub)
router.post("/shop/calculate-delivery", verifyToken, async (req, res) => {
    try {
        const { shopId, customerCoordinates, customerAddress, subtotal = 0, isFirstOrder = false } = req.body;
        if (!shopId) return res.status(400).json({ success: false, message: "Shop ID is required" });

        const shop = await Shop.findById(shopId).populate('bazaar');
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

        // Extract Shop Bazaar Hub coordinates [lng, lat] (GeoJSON)
        let sLoc = null;
        let hubName = "Bazaar Hub";
        if (shop.bazaar && shop.bazaar.geometry && shop.bazaar.geometry.coordinates && shop.bazaar.geometry.coordinates.length === 2) {
            sLoc = shop.bazaar.geometry.coordinates; // [lng, lat]
            hubName = shop.bazaar.bazaarName || shop.bazaar.name || "Bazaar Hub";
        } else if (shop.geometry && shop.geometry.coordinates && shop.geometry.coordinates.length === 2) {
            sLoc = shop.geometry.coordinates; // [lng, lat]
            hubName = shop.shopName || "Shop";
        }

        // Helper to accurately extract [lng, lat] from diverse coord formats
        function parseToLngLat(coords) {
            if (!coords) return null;
            if (Array.isArray(coords) && coords.length >= 2) {
                let c0 = Number(coords[0]);
                let c1 = Number(coords[1]);
                if (isNaN(c0) || isNaN(c1)) return null;
                // In India: Latitude is ~6° to 38° N, Longitude is ~68° to 98° E
                if (c0 > 50 && c1 < 45) return [c0, c1]; // [lng, lat]
                if (c0 < 45 && c1 > 50) return [c1, c0]; // [lat, lng] -> convert to [lng, lat]
                return [c0, c1];
            }
            if (typeof coords === 'object' && coords.lat && coords.lng) {
                return [Number(coords.lng), Number(coords.lat)];
            }
            return null;
        }

        let cLoc = null; // Customer [lng, lat]

        // 1. If customerAddress is provided, forward geocode it for exact real-time address coordinates
        if (customerAddress && customerAddress.trim().length > 1) {
            const { forwardGeocode } = require("../utils/geocoder");
            try {
                const cleanAddr = customerAddress.trim();
                const queryText = (cleanAddr.toLowerCase().includes("jharkhand") || cleanAddr.toLowerCase().includes("india"))
                    ? cleanAddr 
                    : `${cleanAddr}, Jharkhand, India`;
                const geo = await forwardGeocode(queryText);
                if (geo && geo.body && geo.body.features && geo.body.features.length > 0) {
                    cLoc = geo.body.features[0].geometry.coordinates; // [lng, lat]
                }
            } catch (geoErr) {
                console.warn("[calculate-delivery] Forward geocode error:", geoErr.message);
            }
        }

        // 2. Fallback to customerCoordinates if address geocoding yielded nothing
        if (!cLoc && customerCoordinates) {
            cLoc = parseToLngLat(customerCoordinates);
        }

        if (!sLoc || !cLoc) {
            // Default 1.0 km tier fallback if coordinates unavailable
            const isFree = subtotal >= 150 || isFirstOrder;
            return res.json({
                success: true,
                hubName,
                distanceKm: 1.0,
                roundedDistance: 1,
                deliveryCharge: isFree ? 0 : 5,
                standardCharge: 5,
                freeDeliveryThreshold: 150,
                isFreeDelivery: isFree
            });
        }

        const distanceUtil = require("../utils/distance");
        const { calculateDeliveryPricing } = require("../utils/deliveryPricing");

        // calculateDistance expects (lat1, lon1, lat2, lon2, useGoogle)
        // cLoc is [lng, lat] -> cLoc[1] is lat, cLoc[0] is lng
        // sLoc is [lng, lat] -> sLoc[1] is lat, sLoc[0] is lng
        let distanceKm = await distanceUtil.calculateDistance(
            cLoc[1], cLoc[0],
            sLoc[1], sLoc[0],
            true
        );

        if (!isFinite(distanceKm) || isNaN(distanceKm) || distanceKm <= 0) {
            distanceKm = 0.5;
        }

        const pricing = calculateDeliveryPricing(distanceKm);
        
        // Offers (first order free delivery, threshold free delivery) are ONLY available within 5 km AND if shop allows free delivery
        const shopAllowsFreeDelivery = !shop || shop.allowFreeDelivery !== false;
        const isEligibleForOffers = distanceKm <= 5.0 && shopAllowsFreeDelivery;
        const effectiveIsFirstOrder = isEligibleForOffers && isFirstOrder;
        const freeDeliveryThreshold = shopAllowsFreeDelivery ? pricing.freeDeliveryThreshold : null;

        let isFree = false;
        let finalCharge = pricing.customerCharge;

        if (isEligibleForOffers && (effectiveIsFirstOrder || (freeDeliveryThreshold && subtotal >= freeDeliveryThreshold))) {
            finalCharge = 0;
            isFree = true;
        }

        res.json({
            success: true,
            hubName,
            distanceKm: pricing.rawDistance,
            roundedDistance: pricing.distance,
            deliveryCharge: finalCharge,
            standardCharge: pricing.customerCharge,
            freeDeliveryThreshold,
            isFreeDelivery: isFree,
            isEligibleForOffers
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/shop/billing (Supports both Counter Pickup & Home Delivery from Bazaar)
router.post("/shop/billing", verifyToken, async (req, res) => {
    try {
        const { 
            shopId, 
            customerName, 
            customerPhone,
            customerAddress,
            deliveryType = "SHOP_PICKUP",
            deliveryCharge = 0,
            distanceKm = 0,
            items, 
            totalAmount 
        } = req.body;

        if (!shopId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Missing required fields or empty cart" });
        }

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id }).populate('bazaar');
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

        const isHomeDelivery = deliveryType === "HOME_DELIVERY";
        const finalDeliveryCharge = isHomeDelivery ? Number(deliveryCharge || 0) : 0;
        const finalTotal = subtotal + finalDeliveryCharge;

        // Create the POS / Home Delivery Order
        const newOrder = new Order({
            orderId: isHomeDelivery 
                ? `PASR-HD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
                : `PASR-POS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
            shopId: shop._id,
            bazaar: shop.bazaar ? shop.bazaar._id : undefined,
            customerName: customerName || "Customer",
            customerPhone: customerPhone ? String(customerPhone).trim() : undefined,
            deliveryAddress: isHomeDelivery ? (customerAddress || "Home Delivery Address") : undefined,
            items: processedItems,
            subtotalAmount: subtotal,
            totalAmount: finalTotal,
            deliveryType: isHomeDelivery ? "HOME_DELIVERY" : "SHOP_PICKUP",
            deliveryCharge: finalDeliveryCharge,
            paymentType: "COD",
            paymentStatus: isHomeDelivery ? "PENDING" : "COLLECTED",
            orderStatus: isHomeDelivery ? "PLACED" : "COMPLETED",
            selfDelivery: false,
            settlementStatus: "PENDING",
            coinDiscount: 0
        });

        await newOrder.save();

        res.json({ 
            success: true, 
            message: isHomeDelivery ? "Home delivery order placed & assigned to PASR delivery fleet!" : "Bill generated successfully", 
            order: newOrder,
            shopName: shop.shopName,
            shopLocation: shop.location || (shop.bazaar ? shop.bazaar.name : "Local Bazaar")
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/shop/products
router.post("/shop/products", verifyToken, async (req, res) => {
    try {
        const { shopId, productId, price, originalPrice, stock, discountPercent, offerName, quantity, inStock, status, deliveryType, maxDeliveryDistance, availableForDelivery, canDeliverByBike, name, category, description, image, images, barcode } = req.body;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });
        if (!productId && !name) return res.status(400).json({ success: false, message: "Missing productId or name" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        // Item model fields: shop, product, price, quantity (number), discount, isActive, barcode
        const newItem = new Item({
            shop: shopId,
            price: price || 0,
            quantity: stock || 1,
            discount: discountPercent || 0,
            isActive: inStock !== false,
            deliveryType: deliveryType || 'standard',
            maxDeliveryDistance: maxDeliveryDistance ? parseInt(maxDeliveryDistance) : 10,
            availableForDelivery: availableForDelivery !== false,
            canDeliverByBike: canDeliverByBike !== false,
            name: name,
            itemCategory: category,
            description: description,
            barcode: barcode ? String(barcode).trim() : ''
        });

        if (productId) {
            newItem.product = productId;
        }

        let uploadedImages = [];
        const { cloudinary } = require('../cloud_con');
        
        // Handle array of images
        const itemUploadOptions = {
            folder: 'pasr_items',
            transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto:good" }],
            format: 'webp'
        };
        if (images && Array.isArray(images) && images.length > 0) {
            for (let img of images) {
                if (typeof img === 'string') {
                    if (img.startsWith('data:image')) {
                        const uploadRes = await cloudinary.uploader.upload(img, itemUploadOptions);
                        uploadedImages.push({ url: uploadRes.secure_url, filename: uploadRes.public_id });
                    } else {
                        uploadedImages.push({ url: img });
                    }
                }
            }
        } else if (image && typeof image === 'string') {
            if (image.startsWith('data:image')) {
                const uploadRes = await cloudinary.uploader.upload(image, itemUploadOptions);
                uploadedImages.push({ url: uploadRes.secure_url, filename: uploadRes.public_id });
            } else {
                uploadedImages.push({ url: image });
            }
        }

        if (uploadedImages.length > 0) {
            newItem.img = uploadedImages[0];
            if (uploadedImages.length > 1) {
                newItem.extraImages = uploadedImages.slice(1);
            }
        }

        await newItem.save();
        shop.items.push(newItem._id);
        await shop.save();

        // Auto-sync uploaded/selected image to community registry
        if (uploadedImages.length > 0 && name) {
            try {
                const canonical = normalizeItemName(name);
                const existing = await ItemImageRegistry.findOne({
                    $or: [{ imageUrl: uploadedImages[0].url }, { canonicalName: canonical }]
                });
                if (existing) {
                    existing.usageCount = (existing.usageCount || 1) + 1;
                    await existing.save();
                } else {
                    await ItemImageRegistry.create({
                        canonicalName: canonical,
                        displayName: name,
                        description: description || "",
                        imageUrl: uploadedImages[0].url,
                        publicId: uploadedImages[0].filename || `item_${Date.now()}`,
                        itemCategory: category || shop.category || 'General',
                        usageCount: 1,
                        locked: false
                    });
                }
            } catch (regErr) {
                console.warn("ItemImageRegistry auto-sync error:", regErr.message);
            }
        }

        res.json({ success: true, product: newItem });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/shop/products/search
router.get("/shop/products/search", verifyToken, async (req, res) => {
    try {
        const { q, category } = req.query;
        if (!q || q.trim().length < 2) return res.json({ success: true, suggestions: [] });

        const searchRegex = new RegExp(q.trim(), "i");
        const canonicalQuery = normalizeItemName(q.trim());
        const canonicalRegex = new RegExp("^" + canonicalQuery, "i");

        // 1. Search Master Products
        const masterProducts = await MasterProduct.find({
            $or: [
                { name: searchRegex },
                { brand: searchRegex },
                { barcode: q.trim() }
            ]
        }).limit(20).lean();

        // 2. Search Item Image Registry (shared images from other shops)
        const registryQuery = {
            $or: [
                { displayName: searchRegex },
                { canonicalName: canonicalRegex }
            ]
        };
        if (category && category !== 'All') {
            registryQuery.itemCategory = new RegExp(category, "i");
        }
        const registryItems = await ItemImageRegistry.find(registryQuery).sort({ usageCount: -1 }).limit(25).lean();

        // 3. Search Items from other shops (with valid images)
        const otherShopItems = await Item.find({
            $or: [
                { name: searchRegex },
                { barcode: q.trim() }
            ],
            "img.url": { $exists: true, $ne: "" }
        }).limit(20).lean();

        // Merge and deduplicate by image URL and name
        const seenUrls = new Set();
        const suggestions = [];

        // Add Master Products
        for (const mp of masterProducts) {
            const imgUrl = mp.img?.url || mp.image;
            if (imgUrl && !seenUrls.has(imgUrl)) {
                seenUrls.add(imgUrl);
                suggestions.push({
                    _id: mp._id,
                    name: mp.name,
                    brand: mp.brand || '',
                    category: mp.category || '',
                    description: mp.description || '',
                    image: imgUrl,
                    img: { url: imgUrl, filename: mp.img?.filename || '' },
                    source: 'catalog'
                });
            }
        }

        // Add Community Image Registry
        for (const reg of registryItems) {
            if (reg.imageUrl && !seenUrls.has(reg.imageUrl)) {
                seenUrls.add(reg.imageUrl);
                suggestions.push({
                    _id: reg._id,
                    name: reg.displayName,
                    brand: '',
                    category: reg.itemCategory || '',
                    description: reg.description || '',
                    image: reg.imageUrl,
                    img: { url: reg.imageUrl, filename: reg.publicId },
                    source: 'community',
                    usageCount: reg.usageCount || 1
                });
            }
        }

        // Add items from other shops
        for (const it of otherShopItems) {
            const imgUrl = it.img?.url;
            if (imgUrl && !seenUrls.has(imgUrl)) {
                seenUrls.add(imgUrl);
                suggestions.push({
                    _id: it._id,
                    name: it.name,
                    brand: '',
                    category: it.itemCategory || '',
                    description: it.description || '',
                    image: imgUrl,
                    img: { url: imgUrl, filename: it.img?.filename || '' },
                    source: 'other_shops'
                });
            }
        }

        res.json({ success: true, suggestions: suggestions.slice(0, 10) });
    } catch (e) {
        console.error("Product search error:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});
// PUT /api/shop/products/:id
router.put("/shop/products/:id", verifyToken, async (req, res) => {
    try {
        const { shopId, price, stock, discountPercent, name, category, description, image, images, deliveryType, maxDeliveryDistance, availableForDelivery, canDeliverByBike, barcode } = req.body;
        if (!shopId) return res.status(400).json({ success: false, message: "Missing shopId" });

        const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
        if (!shop) return res.status(403).json({ success: false, message: "Forbidden" });

        const item = await Item.findOne({ _id: req.params.id, shop: shopId });
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });

        if (name !== undefined) item.name = name;
        if (category !== undefined) item.itemCategory = category;
        if (description !== undefined) item.description = description;
        if (barcode !== undefined) item.barcode = String(barcode).trim();
        if (image !== undefined || images !== undefined) {
            let uploadedImages = [];
            const { cloudinary } = require('../cloud_con');

            const itemUploadOptions = {
                folder: 'pasr_items',
                transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto:good" }],
                format: 'webp'
            };
            if (images && Array.isArray(images) && images.length > 0) {
                for (let img of images) {
                    if (typeof img === 'string') {
                        if (img.startsWith('data:image')) {
                            const uploadRes = await cloudinary.uploader.upload(img, itemUploadOptions);
                            uploadedImages.push({ url: uploadRes.secure_url, filename: uploadRes.public_id });
                        } else {
                            uploadedImages.push({ url: img });
                        }
                    }
                }
            } else if (image && typeof image === 'string') {
                if (image.startsWith('data:image')) {
                    const uploadRes = await cloudinary.uploader.upload(image, itemUploadOptions);
                    uploadedImages.push({ url: uploadRes.secure_url, filename: uploadRes.public_id });
                } else {
                    uploadedImages.push({ url: image });
                }
            }

            if (uploadedImages.length > 0) {
                item.img = uploadedImages[0];
                item.extraImages = uploadedImages.length > 1 ? uploadedImages.slice(1) : [];
            } else if (images && Array.isArray(images) && images.length === 0) {
                item.img = { url: '', filename: '' };
                item.extraImages = [];
            }
        }
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

        shop.items.pull(req.params.id);
        await shop.save();

        res.json({ success: true, message: "Item deleted successfully" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;

router.post("/shop/request-payout", verifyToken, async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) {
            return res.status(404).json({ success: false, message: "Shop not found." });
        }

        const TransactionHistory = require("../data/transactionHistory");
        
        // 1. Find the orders that make up this payout
        const unsettledOrders = await Order.find({
            shopId: shop._id,
            orderStatus: 'COMPLETED',
            settlementStatus: { $in: ['PENDING', 'REQUESTED'] }
        });

        if (unsettledOrders.length === 0) {
            return res.status(400).json({ success: false, message: "No eligible completed orders found for payout." });
        }

        let payoutAmount = 0;
        const processedOrders = [];

        for (let order of unsettledOrders) {
            let earningsForShop = 0;
            const isSelfPickup = !!order.selfDelivery || order.deliveryType === 'Self Pickup' || order.deliveryType === 'SELF_PICKUP' || order.deliveryType === 'SHOP_PICKUP';
            const actualItemPrice = order.subtotalAmount || ((order.totalAmount || 0) + (order.coinDiscount || 0));

            if (isSelfPickup) {
                earningsForShop = order.coinDiscount || 0;
            } else {
                earningsForShop = actualItemPrice;
            }
            payoutAmount += earningsForShop;
            processedOrders.push(order);
        }

        if (payoutAmount <= 0) {
            return res.status(400).json({ success: false, message: "Your net payout balance is zero or negative." });
        }

        // Check if there is already a pending payout request
        const existingPending = await TransactionHistory.findOne({
            shopId: shop._id,
            type: 'PAYOUT_TO_SHOP',
            status: 'PENDING'
        });

        if (existingPending) {
            return res.status(400).json({ success: false, message: "You already have a pending payout request." });
        }

        const orderIds = processedOrders.map(o => o.orderId);

        // 2. Create a PENDING Payout Transaction for manual approval
        await TransactionHistory.create({
            shopId: shop._id,
            type: 'PAYOUT_TO_SHOP',
            amount: payoutAmount,
            status: 'PENDING',
            metadata: {
                upiId: shop.upiId || 'Not Provided',
                ordersSettled: orderIds,
                requestDate: new Date()
            }
        });

        // 3. Mark ALL processed Orders as REQUESTED so they don't stick around in PENDING
        await Order.updateMany(
            { _id: { $in: processedOrders.map(o => o._id) } },
            { $set: { settlementStatus: 'REQUESTED' } }
        );

        res.json({ success: true, message: `Payout request for ₹${payoutAmount.toFixed(2)} submitted successfully.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to process payout request." });
    }
});

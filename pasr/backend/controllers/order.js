const Order = require("../data/order");
const Shop = require("../data/shops");
const distanceUtil = require("../utils/distance");
const chargeUtil = require("../utils/deliveryCharge");
const { calculateDeliveryPricing } = require("../utils/deliveryPricing");
const otpUtil = require("../utils/otpGenerator");
const { createNotification } = require("../utils/notificationHelper");
const FreeDeliveryUsage = require("../data/freeDeliveryUsage");
const { reverseGeocode } = require("../utils/geocoder");
const orderBus = require("../events/eventBus");


// Helper to generate a unique string (e.g., PASR-ORDER-12345)
const generateOrderId = () => `PASR-ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Helper to get seller details (ID and location) for an order
const getOrderSellerDetails = async (order) => {
    const Shop = require("../data/shops");
    // Try finding a Shop
    let shop = await Shop.findById(order.shopId).populate("owner");
    if (shop && shop.geometry && shop.geometry.coordinates) {
        return {
            sellerId: shop.owner._id,
            location: shop.geometry.coordinates,
            name: shop.shopName,
            phone: shop.owner.username,
            isShop: true
        };
    } else {
        // Check if it's a Local Bazar Seller (direct user)
        const Product = require("../data/product");
        const product = await Product.findOne({ owner: order.shopId });
        if (product && product.geometry && product.geometry.coordinates) {
            const Customer = require("../data/customers");
            const seller = await Customer.findById(order.shopId);
            return {
                sellerId: order.shopId,
                location: product.geometry.coordinates,
                name: seller ? `Local Bazar: ${seller.name}` : "Local Seller",
                phone: seller ? seller.username : null,
                isShop: false
            };
        }
    }
    return null;
};

// 1. Checkout & Create Order
module.exports.checkoutOrder = async (req, res, next) => {
    try {
        const cart = req.session.cart;
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
        }

        // 1. Extract inputs
        const { paymentType, lat, lng, shopId, orderId: clientOrderId, deliveryType, useCoins } = req.body;
        const customerId = req.user._id;

        if (!shopId) {
            return res.status(400).json({ success: false, message: "Shop ID is required for checkout." });
        }

        if (!deliveryType || !['HOME_DELIVERY', 'SELF_PICKUP'].includes(deliveryType)) {
            return res.status(400).json({ success: false, message: "Please specify delivery type: HOME_DELIVERY or SELF_PICKUP." });
        }

        // 1.5 Order Safety: Prevent duplicate orders
        if (clientOrderId) {
            const existingOrder = await Order.findOne({ orderId: clientOrderId });
            if (existingOrder) {
                return res.status(400).json({ success: false, message: "Order processed successfully (duplicate blocked)." });
            }
        }

        // Filter items for this specific shop
        const shopItems = cart.items.filter(item => item.shopId === shopId);
        if (shopItems.length === 0) {
            return res.status(400).json({ success: false, message: "No items found for this shop in your cart." });
        }

        // 2. ATOMIC INVENTORY CHECK & UPDATE
        const Item = require("../data/item");
        const inventoryUpdates = [];

        for (let item of shopItems) {
            const result = await Item.updateOne(
                { _id: item.itemId, quantity: { $gte: item.quantity } },
                { $inc: { quantity: -item.quantity } }
            );

            if (result.modifiedCount === 0) {
                // Out of stock. Rollback any previously updated items in this order loop.
                for (let revert of inventoryUpdates) {
                    await Item.updateOne({ _id: revert.id }, { $inc: { quantity: revert.qty } });
                }
                return res.status(400).json({
                    success: false,
                    message: `Item '${item.name}' is out of stock or quantity exceeds available inventory.`
                });
            }
            inventoryUpdates.push({ id: item.itemId, qty: item.quantity, name: item.name });
        }

        // 3. Calculate amounts based on delivery type
        const subtotalAmount = shopItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        let deliveryCharge = 0;
        let distanceInKm = 0;

        let deliveryDistance = 0;
        let pasrCommission = 0;
        let partnerEarning = 0;
        let estimatedFuelCost = 0;
        let partnerProfit = 0;

        let firstOrderDiscount = 0;
        let grantFreeDelivery = false;
        let deliveryAddress = '';

        if (deliveryType === 'SELF_PICKUP') {
            // Self-pickup: no delivery charge, no distance calculation needed
            deliveryCharge = 0;
            distanceInKm = 0;
        } else {
            // HOME_DELIVERY: location and distance logic
            let cLoc = null;
            if (lat && lng) {
                cLoc = [parseFloat(lng), parseFloat(lat)]; // [lng, lat]
            } else if (req.user.geometry && req.user.geometry.coordinates) {
                cLoc = req.user.geometry.coordinates;
            }

            if (!cLoc || cLoc.length !== 2) {
                for (let revert of inventoryUpdates) {
                    await Item.updateOne({ _id: revert.id }, { $inc: { quantity: revert.qty } });
                }
                return res.status(400).json({ success: false, message: "Please enable location services or update your profile." });
            }

            // Fetch Shop location
            let shop = await Shop.findById(shopId);
            let sLoc;

            if (shop && shop.geometry && shop.geometry.coordinates) {
                sLoc = shop.geometry.coordinates; // [lng, lat]
            } else {
                // Check if it's a Local Bazar Seller
                const Product = require("../data/product");
                const product = await Product.findOne({ owner: shopId });
                if (product && product.geometry && product.geometry.coordinates) {
                    sLoc = product.geometry.coordinates;
                }
            }

            if (!sLoc) {
                for (let revert of inventoryUpdates) {
                    await Item.updateOne({ _id: revert.id }, { $inc: { quantity: revert.qty } });
                }
                return res.status(404).json({ success: false, message: "Shop or Seller location is unavailable." });
            }

            // Calculate distance
            distanceInKm = await distanceUtil.calculateDistance(
                cLoc[1], cLoc[0],
                sLoc[1], sLoc[0],
                true
            );

            // Validate Distance (Max 10km)
            if (distanceInKm > 10) {
                for (let revert of inventoryUpdates) {
                    await Item.updateOne({ _id: revert.id }, { $inc: { quantity: revert.qty } });
                }
                return res.status(400).json({ success: false, message: "Delivery not available beyond 10 km." });
            }

            // Calculate Delivery Pricing metrics
            try {
                const pricing = calculateDeliveryPricing(distanceInKm);
                deliveryCharge = pricing.customerCharge;
                deliveryDistance = pricing.distance;
                pasrCommission = pricing.pasrCommission;
                partnerEarning = pricing.partnerEarning;
                estimatedFuelCost = pricing.estimatedFuelCost;
                partnerProfit = pricing.partnerProfit;
            } catch (pricingError) {
                for (let revert of inventoryUpdates) {
                    await Item.updateOne({ _id: revert.id }, { $inc: { quantity: revert.qty } });
                }
                return res.status(400).json({ success: false, message: pricingError.message });
            }

            // Reverse-geocode to get human-readable delivery address
            try {
                const geoRes = await reverseGeocode(cLoc); // cLoc is [lng, lat]
                if (geoRes.body.features.length > 0) {
                    deliveryAddress = geoRes.body.features[0].place_name;
                }
            } catch (_) {
                // Address lookup is non-critical — continue without it
                deliveryAddress = `Near ${cLoc[1].toFixed(4)}, ${cLoc[0].toFixed(4)}`;
            }

            // Check first-order free delivery eligibility (by mobile number)
            const mobile = String(req.user.username);
            const existingFreeDelivery = await FreeDeliveryUsage.findOne({ mobile });
            if (!existingFreeDelivery) {
                // First home-delivery order — waive delivery charge
                firstOrderDiscount = deliveryCharge;
                deliveryCharge = 0;
                grantFreeDelivery = true; // flag to save usage record after order is saved
            }
        }

        let totalAmount = subtotalAmount + deliveryCharge;

        // Apply Coin Discount
        let coinDiscount = 0;
        if (useCoins === true || useCoins === 'true') {
            const Customer = require("../data/customers");
            const customerDoc = await Customer.findById(customerId);
            if (customerDoc && customerDoc.coins > 0) {
                coinDiscount = Math.min(customerDoc.coins, totalAmount);
                totalAmount -= coinDiscount;
                
                customerDoc.coins -= coinDiscount;
                await customerDoc.save();
            }
        }



        // Create Order Document
        const order = new Order({
            orderId: clientOrderId || generateOrderId(),
            customerId,
            shopId: shopId,
            items: shopItems,
            subtotalAmount,
            deliveryCharge,
            totalAmount,
            distanceInKm,
            deliveryType,
            deliveryAddress,
            firstOrderDiscount,
            coinDiscount,

            deliveryDistance,
            pasrCommission,
            partnerEarning,
            estimatedFuelCost,
            partnerProfit,

            paymentType,
            paymentStatus: 'PENDING',
            deliveryOTP: otpUtil.generateOTP(),
            orderStatus: 'CREATED'
        });

        await order.save();

        // Record free delivery usage AFTER order is saved (so failed orders don't consume the free delivery)
        if (grantFreeDelivery) {
            await FreeDeliveryUsage.create({ mobile: String(req.user.username), usedAt: new Date() });
        }

        // Create Event for Seller
        orderBus.emit("ORDER_CREATED", order);

        // Notify Seller
        const sellerInfo = await getOrderSellerDetails(order);
        if (sellerInfo && sellerInfo.sellerId && typeof createNotification === 'function') {
            await createNotification(
                sellerInfo.sellerId,
                'ORDER_RECEIVED',
                order._id,
                'New Order Received',
                `You have a new order: ${order.orderId}`
            );
        }



        // Partial Clear cart (remove items for this shop)
        cart.items = cart.items.filter(item => item.shopId !== shopId);
        cart.subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);

        let razorpayOrderData = null;
        if (paymentType === 'PREPAID') {
            if (totalAmount === 0) {
                // If coins cover the entire amount, mark as VERIFIED directly
                order.paymentStatus = 'VERIFIED';
                // Automatically move order to READY_FOR_DELIVERY since it effectively paid
                order.orderStatus = 'READY_FOR_DELIVERY';
                await order.save();
                orderBus.emit("ORDER_READY", order);
            } else {
                const Razorpay = require('razorpay');
                const rzp = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET
                });
                const rzpOrder = await rzp.orders.create({
                    amount: Math.round(totalAmount * 100), // amount in paise
                    currency: 'INR',
                    receipt: order.orderId
                });
                order.razorpayOrderId = rzpOrder.id;
                await order.save(); // Save the newly attached razorpay ID

                razorpayOrderData = {
                    id: rzpOrder.id,
                    amount: rzpOrder.amount,
                    currency: rzpOrder.currency,
                    keyId: process.env.RAZORPAY_KEY_ID
                };
            }
        }
        cart.subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);

        const sellerDetails = await getOrderSellerDetails(order);
        const itemsSummary = shopItems.map(i => i.name).join(", ");

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            orderId: order.orderId,
            orderDbId: order._id,
            shopOwnerPhone: sellerDetails ? sellerDetails.phone : null,
            itemsSummary,
            totalAmount: order.totalAmount,
            paymentType: order.paymentType,
            deliveryType: order.deliveryType,
            razorpay: razorpayOrderData
        });

    } catch (e) {
        next(e);
    }
};

// 2. Shop Accepts Order
module.exports.shopAcceptOrder = async (req, res, next) => {
    try {
        const { id } = req.params; // Order _id

        // Find order
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const sellerDetails = await getOrderSellerDetails(order);
        if (!sellerDetails || !sellerDetails.sellerId.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: "Unauthorized: You do not own this shop/listing." });
        }

        if (order.orderStatus !== 'CREATED') {
            return res.status(400).json({ success: false, message: "Order cannot be accepted at this stage." });
        }

        order.orderStatus = 'ACCEPTED';
        await order.save();

        if (typeof createNotification === 'function') {
            await createNotification(
                order.customerId,
                'ORDER_STATUS_UPDATE',
                order._id,
                'Order Accepted',
                `Your order ${order.orderId} has been accepted and is being prepared.`
            );
        }

        // Emit Event
        orderBus.emit("ORDER_ACCEPTED", order);



        res.status(200).json({ success: true, message: "Order accepted by shop.", order });
    } catch (e) {
        next(e);
    }
};

// 3. Shop Confirms Payment (For PREPAID)
module.exports.shopConfirmPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const sellerDetails = await getOrderSellerDetails(order);
        if (!sellerDetails || !sellerDetails.sellerId.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: "Unauthorized." });
        }

        if (order.paymentType !== 'PREPAID') {
            return res.status(400).json({ success: false, message: "This order is not PREPAID." });
        }

        order.paymentStatus = 'VERIFIED';
        order.orderStatus = 'READY_FOR_DELIVERY'; // Automatically moves to ready once payment verified for prepaid
        await order.save();

        // Emit Event
        orderBus.emit("ORDER_READY", order);



        res.status(200).json({ success: true, message: "Payment verified. Order ready for delivery.", order });
    } catch (e) {
        next(e);
    }
}

// 4. Shop Marks COD Order Ready
module.exports.shopMarkReady = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const sellerDetails = await getOrderSellerDetails(order);
        if (!sellerDetails || !sellerDetails.sellerId.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: "Unauthorized." });
        }

        if (order.paymentType === 'PREPAID' && order.paymentStatus !== 'VERIFIED') {
            return res.status(400).json({ success: false, message: "Cannot mark ready before verifying PREPAID payment." });
        }

        order.orderStatus = 'READY_FOR_DELIVERY';
        await order.save();

        if (typeof createNotification === 'function') {
            await createNotification(
                order.customerId,
                'ORDER_STATUS_UPDATE',
                order._id,
                'Order Ready',
                `Your order ${order.orderId} is packed and ready for delivery!`
            );
        }

        // Emit Event
        orderBus.emit("ORDER_READY", order);



        res.status(200).json({ success: true, message: "Order marked ready for delivery.", order });
    } catch (e) {
        next(e);
    }
}

// 4b. Shop Marks Order as Packed (from WhatsApp Link)
module.exports.shopPackOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const sellerDetails = await getOrderSellerDetails(order);
        if (!sellerDetails || !sellerDetails.sellerId.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: "Unauthorized." });
        }

        order.orderStatus = 'PACKED';
        await order.save();

        const { createNotification } = require("../utils/notificationHelper");
        if (typeof createNotification === 'function') {
            await createNotification(
                order.customerId,
                'ORDER_STATUS_UPDATE',
                order._id,
                'Order Packed',
                `Your order ${order.orderId} is packed by the shop.`
            );
        }

        // Emit Event
        orderBus.emit("ORDER_PACKED", order);

        res.status(200).json({ success: true, message: "Order marked as packed.", order });
    } catch (e) {
        next(e);
    }
}

// 5. Customer Gets their Orders & Shop Orders
module.exports.getCustomerOrders = async (req, res, next) => {
    try {
        // Find if this user owns any shops
        const ownedShops = await Shop.find({ owner: req.user._id }).select('_id');
        const shopIds = ownedShops.map(s => s._id);

        const orders = await Order.find({
            customerId: req.user._id,
            // Exclude orders that are PREPAID and still PENDING
            $nor: [{ paymentType: 'PREPAID', paymentStatus: 'PENDING' }]
        })
            .populate({
                path: 'items.itemId',
                populate: { path: 'product', select: 'img' },
                select: 'img product'
            })
            .sort({ createdAt: -1 });

        // Resolve seller details for each order to handle both Shops and Local Bazar
        const processedOrders = await Promise.all(orders.map(async (order) => {
            const orderObj = order.toObject();
            const sellerDetails = await getOrderSellerDetails(order);
            if (sellerDetails) {
                orderObj.resolvedSeller = sellerDetails;
            }

            // Resolve item images
            if (orderObj.items) {
                orderObj.items = orderObj.items.map(item => {
                    let imageUrl = '';
                    if (item.itemId) {
                        if (item.itemId.img && item.itemId.img.url) {
                            imageUrl = item.itemId.img.url;
                        } else if (item.itemId.product && item.itemId.product.img && item.itemId.product.img.url) {
                            imageUrl = item.itemId.product.img.url;
                        }
                    }
                    item.imageUrl = imageUrl;
                    return item;
                });
            }

            return orderObj;
        }));

        // Return JSON for API
        if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.json({ success: true, orders: processedOrders });
        }

        // Render the page
        res.render("pages/myOrders.ejs", { orders: processedOrders });
    } catch (e) {
        next(e);
    }
}

// 5b. Shopkeeper Dashboard — only orders for their shops
module.exports.getShopOrders = async (req, res, next) => {
    try {
        const Customer = require("../data/customers");

        // Find all shops owned by this user
        const ownedShops = await Shop.find({ owner: req.user._id }).select('_id shopName dueToPasr');
        const shopIds = ownedShops.map(s => s._id.toString());
        const totalDue = ownedShops.reduce((sum, s) => sum + (s.dueToPasr || 0), 0);

        if (shopIds.length === 0 && String(req.user._id) === String(req.user._id)) {
            // Also check Local Bazar (where shopId === seller's customerId)
        }

        // Fetch orders for all owned shops (including Local Bazar where shopId = owner _id)
        const allShopIds = [...shopIds.map(id => require('mongoose').Types.ObjectId.createFromHexString(id)), req.user._id];

        const orders = await Order.find({
            shopId: { $in: allShopIds },
            $nor: [{ paymentType: 'PREPAID', paymentStatus: 'PENDING' }]
        })
            .populate({
                path: 'items.itemId',
                populate: { path: 'product', select: 'img' },
                select: 'img product'
            })
            .sort({ createdAt: -1 });

        // Resolve customer & shop details
        const processedOrders = await Promise.all(orders.map(async (order) => {
            const orderObj = order.toObject();

            // Resolve seller (shop) info
            const sellerDetails = await getOrderSellerDetails(order);
            if (sellerDetails) orderObj.resolvedSeller = sellerDetails;

            // Resolve customer info
            try {
                const customer = await Customer.findById(order.customerId).select('name username');
                if (customer) {
                    orderObj.resolvedCustomer = { name: customer.name, mobile: customer.username };
                }
            } catch (_) { }

            // Resolve item images
            if (orderObj.items) {
                orderObj.items = orderObj.items.map(item => {
                    let imageUrl = '';
                    if (item.itemId) {
                        if (item.itemId.img && item.itemId.img.url) {
                            imageUrl = item.itemId.img.url;
                        } else if (item.itemId.product && item.itemId.product.img && item.itemId.product.img.url) {
                            imageUrl = item.itemId.product.img.url;
                        }
                    }
                    item.imageUrl = imageUrl;
                    return item;
                });
            }

            return orderObj;
        }));

        const pendingCount = processedOrders.filter(o =>
            ['CREATED', 'ACCEPTED', 'READY_FOR_DELIVERY'].includes(o.orderStatus)
        ).length;

        res.render("pages/shopOrders.ejs", {
            orders: processedOrders,
            ownedShops,
            pendingCount,
            totalDue
        });
    } catch (e) {
        next(e);
    }
}



// 6a. Shopkeeper: Deliver by themselves (self delivery)
module.exports.selfDeliver = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        const sellerDetails = await getOrderSellerDetails(order);
        if (!sellerDetails || !sellerDetails.sellerId.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: "Unauthorized." });
        }

        if (!['READY_FOR_DELIVERY', 'ACCEPTED', 'CREATED'].includes(order.orderStatus)) {
            return res.status(400).json({ success: false, message: "Order cannot be self-delivered at this stage." });
        }

        order.selfDelivery = true;
        order.orderStatus = 'OUT_FOR_DELIVERY';
        await order.save();

        // Emit Event
        orderBus.emit("ORDER_OUT_FOR_DELIVERY", order);



        res.status(200).json({ success: true, message: "Order marked as self-delivery. You're on the way!" });
    } catch (e) {
        next(e);
    }
};

// 6b. Shopkeeper: Broadcast to all delivery partners
module.exports.broadcastDelivery = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        const sellerDetails = await getOrderSellerDetails(order);
        if (!sellerDetails || !sellerDetails.sellerId.equals(req.user._id)) {
            return res.status(403).json({ success: false, message: "Unauthorized." });
        }

        if (!['READY_FOR_DELIVERY', 'ACCEPTED', 'CREATED'].includes(order.orderStatus)) {
            return res.status(400).json({ success: false, message: "Order is not in a deliverable state." });
        }

        const shopLat = sellerDetails.location[1];
        const shopLng = sellerDetails.location[0];

        // Find all eligible delivery partners in range
        const DeliveryPartner = require("../data/deliveryPartner");
        const allPartners = await DeliveryPartner.find({
            isActive: true,
            isApproved: true,
            isBlocked: false,
            $expr: { $lt: ["$currentOrders", "$maxOrdersLimit"] }
        });

        const partnersInRange = allPartners.filter(p => {
            const dist = distanceUtil.calculateDistance(shopLat, shopLng, p.workLocation.lat, p.workLocation.lng);
            return dist <= p.workLocation.serviceRadius;
        });

        if (partnersInRange.length === 0) {
            return res.status(404).json({ success: false, message: "No delivery partners are currently available in your area." });
        }

        // Mark order as BROADCAST
        order.orderStatus = 'BROADCAST';
        await order.save();

        // Emit Event for Partners
        orderBus.emit("ORDER_BROADCAST", { order, partners: partnersInRange });



        res.status(200).json({
            success: true,
            message: `Broadcast sent to ${partnersInRange.length} partner(s) nearby. Waiting for someone to accept.`,
            broadcastCount: partnersInRange.length
        });
    } catch (e) {
        next(e);
    }
};

// 6c. Delivery partner claims a broadcast order (first come, first served)
module.exports.claimBroadcastOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const DeliveryPartner = require("../data/deliveryPartner");

        const partner = await DeliveryPartner.findOne({ user: req.user._id });
        if (!partner) return res.status(403).json({ success: false, message: "Delivery partner profile not found." });
        if (!partner.isApproved || partner.isBlocked) return res.status(403).json({ success: false, message: "Your account is not authorized." });

        // Atomically claim the order (only if still BROADCAST — prevents two partners grabbing same order)
        const order = await Order.findOneAndUpdate(
            { _id: id, orderStatus: 'BROADCAST' },
            {
                orderStatus: 'ASSIGNED',
                deliveryPartnerId: partner._id,
                partnerSnapshot: {
                    name: partner.fullName,
                    phone: partner.phoneNumber,
                    vehicle: partner.vehicleType
                }
            },
            { new: true }
        );

        if (!order) {
            return res.status(409).json({ success: false, message: "This order was already claimed by another partner. Check for other available orders." });
        }

        // Increment partner load
        await DeliveryPartner.findByIdAndUpdate(partner._id, { $inc: { currentOrders: 1 } });

        // Emit Event
        orderBus.emit("ORDER_STATUS_UPDATE", { order, event: "ASSIGNED" });


        // Emit Event for Seller (Partner claimed)
        orderBus.emit("ORDER_CLAIMED", { order, partner });



        res.status(200).json({
            success: true,
            message: "Order claimed! Go to the shop and pick it up.",
            order: { orderId: order.orderId, totalAmount: order.totalAmount }
        });
    } catch (e) {
        next(e);
    }
};

// 6e. Complete Order with OTP Verification & Earnings/Commission Split
module.exports.completeOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;
        const Order = require("../data/order");
        const Shop = require("../data/shops");
        const DeliveryPartner = require("../data/deliveryPartner");

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        // Basic authorization: Only the assigned delivery partner OR the shop owner (if self-delivery) can complete
        let isAuthorized = false;
        if (order.deliveryPartnerId) {
            const partner = await DeliveryPartner.findById(order.deliveryPartnerId);
            if (partner && partner.user.equals(req.user._id)) {
                isAuthorized = true;
            }
        }

        const sellerDetails = await getOrderSellerDetails(order);
        if (sellerDetails && sellerDetails.sellerId.equals(req.user._id)) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: "Unauthorized to complete this order." });
        }

        if (order.deliveryOTP !== otp) {
            return res.status(400).json({ success: false, message: "Invalid Delivery OTP." });
        }

        if (order.orderStatus === 'COMPLETED') {
            return res.status(400).json({ success: false, message: "Order already completed." });
        }

        // --- Financial Logic ---
        const deliveryCharge = order.deliveryCharge || 0;
        const shop = await Shop.findById(order.shopId);

        if (order.deliveryPartnerId) {
            // Case 1: Delivery Partner delivered
            // Shop owes PASR 100% of delivery charge
            if (shop) {
                shop.dueToPasr = (shop.dueToPasr || 0) + Number(deliveryCharge.toFixed(2));
                await shop.save();
            }

            // Partner earns the dynamically calculated partnerEarning
            const partner = await DeliveryPartner.findById(order.deliveryPartnerId);
            if (partner) {
                // Backward compatibility fallback to (deliveryCharge - 5) if old order is processed
                let earnings = order.partnerEarning || Math.max(0, Number((deliveryCharge - 5).toFixed(2)));
                partner.totalEarnings = (partner.totalEarnings || 0) + earnings;
                partner.pendingPayout = (partner.pendingPayout || 0) + earnings;
                partner.currentOrders = Math.max(0, (partner.currentOrders || 1) - 1);
                partner.totalDeliveries = (partner.totalDeliveries || 0) + 1;
                await partner.save();
            }
        } else if (order.selfDelivery) {
            // Case 2: Shop Owner delivered (Self Delivery)
            // Shop owes PASR the dynamically calculated commission
            if (shop) {
                // Backward compatibility fallback to 5 rupees if old order is processed
                let commission = order.pasrCommission || 5;
                shop.dueToPasr = (shop.dueToPasr || 0) + commission;
                await shop.save();
            }
        }

        // Update Order
        order.orderStatus = 'COMPLETED';
        order.deliveredAt = new Date();
        order.paymentStatus = 'COLLECTED';
        await order.save();

        // Emit Event
        orderBus.emit("ORDER_COMPLETED", order);

        res.status(200).json({
            success: true,
            message: "Order completed successfully! Earnings/Commissions updated.",
            order
        });
    } catch (e) {
        next(e);
    }
};

// 7. Manual Payout Management

// 7a. Admin resets shop's due amount after manual payment
module.exports.resetShopDue = async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const Shop = require("../data/shops");
        const shop = await Shop.findById(shopId);
        if (!shop) return res.status(404).json({ success: false, message: "Shop not found." });

        shop.dueToPasr = 0;
        await shop.save();

        res.status(200).json({ success: true, message: "Shop due amount reset successfully." });
    } catch (e) {
        next(e);
    }
};

// 7b. Admin resets partner's pending payout after manual payment
module.exports.resetPartnerPayout = async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const DeliveryPartner = require("../data/deliveryPartner");
        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });

        partner.pendingPayout = 0;
        await partner.save();

        res.status(200).json({ success: true, message: "Partner pending payout reset successfully." });
    } catch (e) {
        next(e);
    }
};

// 6d. Legacy: keep old requestDelivery as alias for broadcastDelivery for backward compatibility
module.exports.requestDelivery = module.exports.broadcastDelivery;

// Cancel Order (Handles Razorpay Refunds & Inventory Restock)
module.exports.cancelOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const Shop = require("../data/shops");
        const shop = await Shop.findById(order.shopId);

        // Authorize: Only the Customer who placed it OR the Shop owner can cancel it
        const isCustomer = order.customerId.equals(req.user._id);
        let isShopOwner = false;
        if (shop && shop.owner && shop.owner.equals(req.user._id)) {
            isShopOwner = true;
        } else if (String(order.shopId) === String(req.user._id)) {
            isShopOwner = true;
        }
        
        if (!isCustomer && !isShopOwner) {
            return res.status(403).json({ success: false, message: "Unauthorized to cancel this order." });
        }

        // State Check
        const nonCancellableStates = ['PACKED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'];
        if (nonCancellableStates.includes(order.orderStatus)) {
            return res.status(400).json({ success: false, message: `Cannot cancel order in ${order.orderStatus} state.` });
        }

        // Process Razorpay Refund if Prepaid
        if (order.paymentType === 'PREPAID' && order.paymentStatus === 'VERIFIED') {
            if (order.razorpayPaymentId) {
                const Razorpay = require('razorpay');
                const rzp = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET
                });
                
                try {
                    // Razorpay accepts amounts in paise
                    await rzp.payments.refund(order.razorpayPaymentId, { 
                        amount: Math.round(order.totalAmount * 100) 
                    });
                    order.paymentStatus = 'REFUNDED'; // Mark as refunded!
                } catch (refundError) {
                    console.error("Razorpay Refund Error:", refundError);
                    return res.status(500).json({ success: false, message: "Failed to process automated refund via Razorpay. Contact support." });
                }
            } else {
                 return res.status(500).json({ success: false, message: "Missing Razorpay Payment ID to process refund." });
            }
        }

        // Restock Inventory
        const Item = require("../data/item");
        for (let orderItem of order.items) {
            await Item.updateOne(
                { _id: orderItem.itemId }, 
                { $inc: { quantity: orderItem.quantity } }
            );
        }

        // Refund Coins
        if (order.coinDiscount && order.coinDiscount > 0) {
            const Customer = require("../data/customers");
            const cancelCustomer = await Customer.findById(order.customerId);
            if (cancelCustomer) {
                cancelCustomer.coins = (cancelCustomer.coins || 0) + order.coinDiscount;
                await cancelCustomer.save();
            }
        }

        order.orderStatus = 'CANCELLED';
        order.cancellationReason = isCustomer ? "Cancelled by Customer" : "Cancelled by Shop";
        await order.save();
        
        // Push notification (Optional)
        const NotificationHelper = require("../utils/notificationHelper");
        const targetUserId = isCustomer ? (shop && shop.owner ? shop.owner : order.shopId) : order.customerId;
        if (NotificationHelper && typeof NotificationHelper.createNotification === 'function') {
            await NotificationHelper.createNotification(
                targetUserId, 
                'ORDER_STATUS_UPDATE', 
                order._id, 
                'Order Cancelled', 
                `Order ${order.orderId} was cancelled.`
            );
        }

        res.status(200).json({ success: true, message: "Order cancelled successfully.", orderStatus: order.orderStatus });

    } catch (e) {
        next(e);
    }
};

// Fetch lightweight statuses for active orders (For polling)
module.exports.getActiveStatuses = async (req, res, next) => {
    try {
        // Find active orders belonging to this user
        const activeOrders = await Order.find({
            customerId: req.user._id,
            orderStatus: { $nin: ['COMPLETED', 'CANCELLED'] }
        }).select('_id orderStatus paymentStatus');

        res.status(200).json({ success: true, activeOrders });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Render public order request for Shopkeepers clicking WhatsApp Links
module.exports.renderOrderRequest = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId }).populate('items.itemId');
        
        if (!order) {
            req.flash("error", "Order not found");
            return res.redirect("/home");
        }

        const Customer = require("../data/customers");
        const customer = await Customer.findById(order.customerId);

        const sellerDetails = await getOrderSellerDetails(order);
        if (!sellerDetails) {
            req.flash("error", "Shop not found");
            return res.redirect("/home");
        }

        res.render("pages/orderRequest.ejs", { 
            order, 
            customer, 
            shop: sellerDetails 
        });
    } catch (e) {
        next(e);
    }
};

const orderBus = require("../events/eventBus");
const admin = require("../config/firebaseAdmin");
const Customer = require("../data/customers");
const { createNotification } = require("../utils/notificationHelper");

// Helper to get seller details (ID and location) for an order
const getOrderSellerDetails = async (order) => {
    try {
        const Shop = require("../data/shops");
        // Try finding a Shop
        let shop = await Shop.findById(order.shopId).populate("owner");
        if (shop && shop.owner) {
            return {
                seller: shop.owner,
                sellerId: shop.owner._id,
                name: shop.shopName,
                isShop: true
            };
        } else {
            // Check if it's a Local Bazar Seller (direct user)
            const Product = require("../data/product");
            const product = await Product.findOne({ owner: order.shopId });
            const seller = await Customer.findById(order.shopId);
            if (seller) {
                return {
                    seller: seller,
                    sellerId: seller._id,
                    name: seller.name || "Local Seller",
                    isShop: false
                };
            }
        }
    } catch (err) {
        console.error("[Notification Service] Error getting seller details:", err);
    }
    return null;
};

// Common FCM options for high priority delivery (essential for background/closed app)
const getFcmOptions = (payload) => ({
    ...payload,
    android: {
        priority: "high",
        notification: {
            channelId: "pasr_orders",
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
    webpush: {
        headers: {
            Urgency: "high"
        }
    }
});

// Listen for ORDER_CREATED
orderBus.on("ORDER_CREATED", async (order) => {
    try {
        const sellerDetails = await getOrderSellerDetails(order);
        if (!sellerDetails || !sellerDetails.seller) return;

        const { seller, name: sellerName } = sellerDetails;

        const mongoose = require('mongoose');
        let customer = null;
        if (mongoose.Types.ObjectId.isValid(order.customerId)) {
            customer = await Customer.findById(order.customerId);
        }
        const customerName = customer ? customer.name : "A customer";
        const itemsList = order.items.map(i => `${i.name} (x${i.quantity})`).join(", ");

        // 1. Create Internal Notification for Seller
        await createNotification(
            seller._id,
            'ORDER_RECEIVED',
            order._id,
            'New Order Received',
            `${customerName} ordered: ${itemsList}. Total: ₹${order.totalAmount}`
        );

        // 2. Send Push Notification to Seller via FCM
        if (seller.fcmToken) {
            const message = getFcmOptions({
                notification: {
                    title: "🔔 New Order Received!",
                    body: `${customerName} ordered: ${itemsList}`
                },
                data: {
                    orderId: String(order._id),
                    type: "ORDER_RECEIVED"
                },
                token: seller.fcmToken
            });
            await admin.messaging().send(message);
        }

        // 3. Send Push Notification to Customer (for COD)
        if (order.paymentType === 'COD' && customer && customer.fcmToken) {
            const cMessage = getFcmOptions({
                notification: {
                    title: "🎯 Order Placed Successfully!",
                    body: `Your COD order from ${sellerName} for ₹${order.totalAmount} has been sent to the seller.`
                },
                data: {
                    orderId: String(order._id),
                    type: "ORDER_CREATED"
                },
                token: customer.fcmToken
            });
            await admin.messaging().send(cMessage);
        }
    } catch (err) {
        console.error("Error in ORDER_CREATED notification:", err);
    }
});

// Listen for Status Updates
const statusEvents = [
    "PAYMENT_VERIFIED",
    "ORDER_ACCEPTED",
    "ORDER_READY",
    "ORDER_OUT_FOR_DELIVERY",
    "ORDER_COMPLETED",
    "ORDER_CANCELLED"
];

statusEvents.forEach(event => {
    orderBus.on(event, async (order) => {
        try {
            const mongoose = require('mongoose');
            let customer = null;
            if (mongoose.Types.ObjectId.isValid(order.customerId)) {
                customer = await Customer.findById(order.customerId);
            }
            if (!customer) return;

            const sellerDetails = await getOrderSellerDetails(order);
            const sellerName = sellerDetails ? sellerDetails.name : "the seller";

            let title, body;
            switch (event) {
                case "PAYMENT_VERIFIED":
                    title = "Payment Successful";
                    body = `Your secure online payment of ₹${order.totalAmount} for order ${order.orderId} was verified!`;
                    break;
                case "ORDER_ACCEPTED":
                    title = "Order Accepted";
                    body = `Your order ${order.orderId} from ${sellerName} has been accepted.`;
                    break;
                case "ORDER_READY":
                    title = "Order Ready";
                    body = `Your order ${order.orderId} from ${sellerName} is packed and ready for delivery.`;
                    break;
                case "ORDER_OUT_FOR_DELIVERY":
                    title = "Order Out for Delivery";
                    body = `Your order ${order.orderId} from ${sellerName} is on the way!`;
                    break;
                case "ORDER_COMPLETED":
                    title = "Order Completed";
                    body = `Your order ${order.orderId} has been delivered. Enjoy!`;
                    break;
                case "ORDER_CANCELLED":
                    title = "Order Cancelled";
                    body = `Your order ${order.orderId} from ${sellerName} has been cancelled.`;
                    break;
            }

            // 1. Internal Notification for Customer
            await createNotification(
                customer._id,
                'ORDER_STATUS_UPDATE',
                order._id,
                title,
                body
            );

            // 2. FCM Push for Customer
            if (customer.fcmToken) {
                const message = getFcmOptions({
                    notification: { title, body },
                    data: {
                        orderId: String(order._id),
                        type: "ORDER_STATUS_UPDATE"
                    },
                    token: customer.fcmToken
                });
                await admin.messaging().send(message);
            }

            // 3. IF PAYMENT_VERIFIED, ALSO NOTIFY SELLER!
            if (event === "PAYMENT_VERIFIED" && sellerDetails && sellerDetails.seller) {
                const { seller } = sellerDetails;
                if (seller.fcmToken) {
                    await admin.messaging().send(getFcmOptions({
                        notification: {
                            title: "💸 Payment Verified!",
                            body: `Customer paid ₹${order.totalAmount} online for Order ${order.orderId}. Please start packing!`
                        },
                        data: { orderId: String(order._id), type: "PAYMENT_VERIFIED" },
                        token: seller.fcmToken
                    }));
                }
            }
        } catch (err) {
            console.error(`Error in ${event} notification:`, err);
        }
    });
});

// Listen for Broadcast (to Delivery Partners)
orderBus.on("ORDER_BROADCAST", async ({ order, partners }) => {
    try {
        const mongoose = require('mongoose');
        const notifPromises = partners.map(async (p) => {
            if (!mongoose.Types.ObjectId.isValid(p.user)) return;
            const customer = await Customer.findById(p.user);
            if (!customer || !customer.fcmToken) return;

            const message = getFcmOptions({
                notification: {
                    title: "🔔 New Delivery Available!",
                    body: `Order ${order.orderId} (₹${order.totalAmount}) is available for pickup near you.`
                },
                data: {
                    orderId: String(order._id),
                    type: "ORDER_BROADCAST"
                },
                token: customer.fcmToken
            });
            return admin.messaging().send(message);
        });
        await Promise.allSettled(notifPromises);
    } catch (err) {
        console.error("Error in ORDER_BROADCAST notification:", err);
    }
});

// Listen for Order Claimed (to Seller)
orderBus.on("ORDER_CLAIMED", async ({ order, partner }) => {
    try {
        const sellerDetails = await getOrderSellerDetails(order);
        if (!sellerDetails || !sellerDetails.seller) return;

        const { seller } = sellerDetails;
        const title = "✅ Delivery Partner Claimed Order";
        const body = `${partner.fullName} (📱 ${partner.phoneNumber}) claimed order ${order.orderId} and will pick it up shortly.`;

        // 1. Internal
        await createNotification(seller._id, 'ORDER_STATUS_UPDATE', order._id, title, body);

        // 2. FCM
        if (seller.fcmToken) {
            const message = getFcmOptions({
                notification: { title, body },
                data: { orderId: String(order._id), type: "ORDER_CLAIMED" },
                token: seller.fcmToken
            });
            await admin.messaging().send(message);
        }
    } catch (err) {
        console.error("Error in ORDER_CLAIMED notification:", err);
    }
});

// Listen for generic status update objects
orderBus.on("ORDER_STATUS_UPDATE", async ({ order, event }) => {
    try {
        const mongoose = require('mongoose');
        let customer = null;
        if (mongoose.Types.ObjectId.isValid(order.customerId)) {
            customer = await Customer.findById(order.customerId);
        }
        if (!customer) return;

        let title, body;
        if (event === 'ASSIGNED') {
            title = "Delivery Partner Assigned";
            body = `A delivery partner has accepted your order ${order.orderId}.`;
        }

        if (title) {
            await createNotification(customer._id, 'ORDER_STATUS_UPDATE', order._id, title, body);
            if (customer.fcmToken) {
                await admin.messaging().send(getFcmOptions({
                    notification: { title, body },
                    data: { orderId: String(order._id), type: "ORDER_STATUS_UPDATE" },
                    token: customer.fcmToken
                }));
            }
        }
    } catch (err) {
        console.error("Error in ORDER_STATUS_UPDATE notification:", err);
    }
});

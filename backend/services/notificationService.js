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

// Helpers to retrieve role-specific FCM tokens
const getSellerToken = (seller) => seller.partnerFcmToken || seller.fcmToken;
const getCustomerToken = (customer) => customer.customerFcmToken || customer.fcmToken;

// Common FCM options for high priority delivery with default sound
const getFcmOptions = (payload) => ({
    ...payload,
    android: {
        priority: "high",
        notification: {
            channelId: "pasr_orders",
            priority: "high",
            sound: "default",
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

        // Send single Notification (In-App + FCM Push) for Seller
        await createNotification(
            seller._id,
            'ORDER_RECEIVED',
            order._id,
            '🔔 New Order Received!',
            `${customerName} ordered: ${itemsList}. Total: ₹${order.totalAmount}`
        );

        // Send Notification for Customer App (for COD)
        if (order.paymentType === 'COD' && customer) {
            await createNotification(
                customer._id,
                'ORDER_CREATED',
                order._id,
                '🎯 Order Placed Successfully!',
                `Your COD order from ${sellerName} for ₹${order.totalAmount} has been sent to the seller.`
            );
        }
    } catch (err) {
        console.error("Error in ORDER_CREATED notification:", err);
    }
});

// Listen for Status Updates
const statusEvents = [
    "PAYMENT_VERIFIED",
    "ORDER_ACCEPTED",
    "ORDER_REJECTED",
    "ORDER_PACKED",
    "ORDER_READY",
    "ORDER_OUT_FOR_DELIVERY",
    "ORDER_COMPLETED",
    "ORDER_CANCELLED"
];

statusEvents.forEach(event => {
    orderBus.on(event, async (data) => {
        try {
            // Support both direct order object or payload wrapper { order, cancelledBy }
            const order = data.order || data;
            const cancelledBy = data.cancelledBy || (order.cancellationReason && order.cancellationReason.includes('Customer') ? 'CUSTOMER' : 'SHOP');

            const mongoose = require('mongoose');
            let customer = null;
            const custId = (order.customerId && order.customerId._id) ? order.customerId._id : order.customerId;
            if (custId) {
                customer = await Customer.findById(custId);
            }
            if (!customer) return;

            const sellerDetails = await getOrderSellerDetails(order);
            const sellerName = sellerDetails ? sellerDetails.name : "the seller";

            // If Customer cancelled order -> Notify Seller App!
            if (event === "ORDER_CANCELLED" && cancelledBy === 'CUSTOMER') {
                if (sellerDetails && sellerDetails.seller) {
                    await createNotification(
                        sellerDetails.seller._id,
                        'ORDER_CANCELLED_BY_CUSTOMER',
                        order._id,
                        '❌ Order Cancelled by Customer',
                        `Customer ${customer.name || 'User'} cancelled Order #${order.orderId || order._id}.`
                    );
                }
                return;
            }

            // Otherwise, Shopkeeper/System updated status -> Notify Customer App!
            let title, body;
            const displayOrderId = order.orderId || (order._id ? order._id.toString() : '');
            switch (event) {
                case "PAYMENT_VERIFIED":
                    title = "Payment Successful";
                    body = `Your secure online payment of ₹${order.totalAmount} for order ${displayOrderId} was verified!`;
                    break;
                case "ORDER_ACCEPTED":
                    title = "Order Accepted";
                    body = `Your order ${displayOrderId} from ${sellerName} has been accepted.`;
                    break;
                case "ORDER_REJECTED":
                    title = "Order Declined";
                    body = `Your order ${displayOrderId} from ${sellerName} could not be accepted.`;
                    break;
                case "ORDER_PACKED":
                case "ORDER_READY":
                    title = "Order Packed";
                    body = `Your order ${displayOrderId} from ${sellerName} is packed and ready for delivery.`;
                    break;
                case "ORDER_OUT_FOR_DELIVERY":
                    title = "Order Out for Delivery";
                    body = `Your order ${displayOrderId} from ${sellerName} is on the way!`;
                    break;
                case "ORDER_COMPLETED":
                    title = "Order Completed";
                    body = `Your order ${displayOrderId} has been delivered. Enjoy!`;
                    break;
                case "ORDER_CANCELLED":
                    title = "Order Cancelled";
                    body = `Your order ${displayOrderId} from ${sellerName} has been cancelled by the shop.`;
                    break;
            }

            console.log(`[notificationService] Event ${event} triggered for customer ${customer._id}: ${title}`);

            // Single Notification (In-App + FCM Push) for Customer
            await createNotification(
                customer._id,
                'ORDER_STATUS_UPDATE',
                order._id,
                title,
                body
            );

            // IF PAYMENT_VERIFIED, ALSO NOTIFY SELLER!
            if (event === "PAYMENT_VERIFIED" && sellerDetails && sellerDetails.seller) {
                await createNotification(
                    sellerDetails.seller._id,
                    'PAYMENT_VERIFIED',
                    order._id,
                    '💸 Payment Verified!',
                    `Customer paid ₹${order.totalAmount} online for Order ${order.orderId}. Please start packing!`
                );
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

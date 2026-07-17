const orderBus = require("../events/eventBus");

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("join", (userId) => {
            socket.join(String(userId));
            console.log(`User ${userId} joined their private room.`);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected");
        });
    });

    // Listen to orderBus and broadcast to relevant users
    orderBus.on("ORDER_CREATED", async (order) => {
        io.to(String(order.customerId)).emit("orderUpdate", { order, event: "ORDER_CREATED" });
        
        // Notify shop owner
        const Shop = require("../data/shops");
        const shop = await Shop.findById(order.shopId);
        if (shop && shop.owner) {
            io.to(String(shop.owner)).emit("shopOrderUpdate", { order, event: "ORDER_CREATED", message: `New order received: ${order.orderId}` });
        }
    });

    orderBus.on("ORDER_STATUS_UPDATE", (data) => {
        const { order, event } = data;
        io.to(String(order.customerId)).emit("orderUpdate", { order, event });
    });

    orderBus.on("DELIVERY_BROADCAST", async (order) => {
        // Find bazaar of the shop
        const Shop = require("../data/shops");
        const shop = await Shop.findById(order.shopId);
        if (!shop || !shop.bazaar) return;

        let priorityAlert = "🟢 Standard 24-hour Delivery. No rush.";
        let title = "New Delivery Task Available";
        if (order.deliveryPriority === 'RED') {
            priorityAlert = "🚨 URGENT: Quick Delivery Required! High payout.";
            title = "🚨 QUICK DELIVERY TASK";
        } else if (order.deliveryPriority === 'YELLOW') {
            priorityAlert = "⚡ Fast Delivery Available nearby.";
            title = "⚡ FAST DELIVERY TASK";
        }

        // Broadcast to all delivery partners in the bazaar
        // For simplicity, we emit to a bazaar-specific room. Partners should join their bazaar room: socket.join(`bazaar_${bazaarId}`)
        io.to(`bazaar_${shop.bazaar}`).emit("deliveryBroadcast", {
            orderId: order._id,
            priority: order.deliveryPriority,
            title,
            message: priorityAlert,
            shopName: shop.shopName,
            distance: order.distanceInKm
        });
    });
};

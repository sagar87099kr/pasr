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
    orderBus.on("ORDER_CREATED", (order) => {
        io.to(String(order.customerId)).emit("orderUpdate", { order, event: "ORDER_CREATED" });
        // Also notify shop owner if they are connected
        // We'll need the sellerId for this.
    });

    orderBus.on("ORDER_STATUS_UPDATE", (data) => {
        const { order, event } = data;
        io.to(String(order.customerId)).emit("orderUpdate", { order, event });
    });
};

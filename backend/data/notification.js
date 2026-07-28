const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    type: {
        type: String,
        enum: ['ORDER_RECEIVED', 'ORDER_STATUS_UPDATE', 'GENERAL', 'ORDER_CANCELLED_BY_CUSTOMER', 'PAYMENT_VERIFIED', 'ORDER_CREATED'],
        required: true
    },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: '30d' }
});

module.exports = mongoose.model("Notification", notificationSchema);

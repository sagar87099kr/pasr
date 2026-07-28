const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionHistorySchema = new Schema({
    shopId: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: false
    },
    deliveryPartnerId: {
        type: Schema.Types.ObjectId,
        ref: 'DeliveryPartner',
        required: false
    },
    type: {
        type: String,
        enum: ['PAYOUT_TO_SHOP', 'COMMISSION_PAID_TO_PASR', 'PAYOUT_TO_DELIVERY_PARTNER'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    razorpayPaymentId: {
        type: String, // Stored when Shop pays PASR via Razorpay
        default: null
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'PENDING', 'FAILED'],
        default: 'SUCCESS'
    },
    metadata: {
        type: Schema.Types.Mixed // For debugging or additional payment details
    }
}, { timestamps: true });

module.exports = mongoose.model("TransactionHistory", transactionHistorySchema);

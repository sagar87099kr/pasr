const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    orderId: { type: String, unique: true, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    items: [{
        itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        price: Number,
        quantity: Number
    }],
    subtotalAmount: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    distanceInKm: { type: Number, default: 0 },
    deliveryType: { type: String, enum: ['HOME_DELIVERY', 'SELF_PICKUP'], required: true },
    deliveryAddress: { type: String, default: '' }, // human-readable address for home delivery
    firstOrderDiscount: { type: Number, default: 0 },

    paymentType: { type: String, enum: ['PREPAID', 'COD'], required: true },
    paymentStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'COLLECTED'], default: 'PENDING' },

    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    deliveryOTP: { type: String },

    orderStatus: {
        type: String,
        enum: ['CREATED', 'ACCEPTED', 'READY_FOR_DELIVERY', 'BROADCAST', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
        default: 'CREATED'
    },

    selfDelivery: { type: Boolean, default: false }, // true when shop owner delivers themselves
    partnerSnapshot: {
        name: String,
        phone: String,
        vehicle: String
    }, // captured at assignment time so shopkeeper always sees it

    deliveredAt: { type: Date },
    cancellationReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);

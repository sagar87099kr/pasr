const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    orderId: { type: String, unique: true, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false }, // Optional for walk-in POS billing
    customerName: { type: String, default: 'Guest' }, // Name of walk-in customer
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

    // Rural Delivery Pricing Metrics (Optional in WhatsApp flow)
    deliveryDistance: { type: Number, default: 0 },
    pasrCommission: { type: Number, default: 0 },
    partnerEarning: { type: Number, default: 0 },
    estimatedFuelCost: { type: Number, default: 0 },
    partnerProfit: { type: Number, default: 0 },

    deliveryType: { type: String, enum: ['HOME_DELIVERY', 'SELF_PICKUP', 'SHOP_PICKUP'], default: 'SHOP_PICKUP' },
    deliveryPriority: { type: String, enum: ['RED', 'YELLOW', 'GREEN'], default: 'YELLOW' },
    deliveryAddress: { type: String, default: '' },
    firstOrderDiscount: { type: Number, default: 0 },

    paymentType: { type: String, enum: ['PREPAID', 'COD', 'WHATSAPP'], default: 'WHATSAPP' },
    paymentStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'COLLECTED'], default: 'PENDING' },

    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    deliveryOTP: { type: String },

    // Razorpay Fields (Keep for legacy/multi-mode support)
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    orderStatus: {
        type: String,
        enum: ['CREATED', 'ORDER_SHARED', 'ACCEPTED', 'PACKED', 'READY_FOR_DELIVERY', 'BROADCAST', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
        default: 'ORDER_SHARED'
    },
    
    adminVerified: { type: Boolean, default: false },


    shareableLink: { type: String }, // Link to view this order summary

    selfDelivery: { type: Boolean, default: false },
    partnerSnapshot: {
        name: String,
        phone: String,
        vehicle: String
    },

    estimatedDeliveryTime: { type: Date },
    deliveredAt: { type: Date },
    cancellationReason: { type: String },

    // Financial Settlement
    settlementStatus: { type: String, enum: ['PENDING', 'REQUESTED', 'SETTLED'], default: 'PENDING' },

    coinDiscount: { type: Number, default: 0 }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

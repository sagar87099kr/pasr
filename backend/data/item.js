const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const itemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: "MasterProduct",
        required: false // Optional for standalone/custom items
    },
    // Metadata (now mostly served from MasterProduct, but kept for legacy/standalone items)
    name: {
        type: String,
        required: false // Now optional if product ref exists
    },
    img: {
        url: String,
        filename: String
    },
    extraImages: [
        {
            url: String,
            filename: String
        }
    ],
    itemCategory: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    sizes: {
        type: [String],
        default: []
    },

    // Shop specific overrides
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    shop: {
        type: Schema.Types.ObjectId,
        ref: "Shop"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    discount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    deliveryType: {
        type: String,
        enum: ['grocery', 'instant', 'standard'],
        default: 'standard'
    },
    canDeliverByBike: {
        type: Boolean,
        default: true
    },
    preparationTime: {
        type: Number,
        default: 0
    },
    maxDeliveryDistance: {
        type: Number,
        default: 10
    },
    availableForDelivery: {
        type: Boolean,
        default: true
    },
    weight: {
        type: Number,
        default: 0
    },
    offerPrice: {
        type: Number
    },
    maxQuantityPerOrder: {
        type: Number,
        default: 10
    },
    deliveryCategory: {
        type: String,
        enum: ['quick', 'fast', 'normal', 'not_deliverable'],
        default: 'normal'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review"
        }
    ]
});

// Compound index for fast lookup of a shop's inventory for a product
itemSchema.index({ shop: 1, product: 1 });
itemSchema.index({ name: 'text' }); // Still useful for custom items

// Index for optimizing homepage item feeds
itemSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Item", itemSchema);

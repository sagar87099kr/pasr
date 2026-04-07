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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for fast lookup of a shop's inventory for a product
itemSchema.index({ shop: 1, product: 1 });
itemSchema.index({ name: 'text' }); // Still useful for custom items

// Index for optimizing homepage item feeds
itemSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Item", itemSchema);

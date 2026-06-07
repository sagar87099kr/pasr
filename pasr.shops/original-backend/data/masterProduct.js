const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const masterProductSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    brand: {
        type: String,
        trim: true,
        default: "Generic"
    },
    category: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    unit: {
        type: String,
        default: "each" // e.g., kg, packet, 500g
    },
    description: {
        type: String,
        maxlength: 500,
        default: ""
    },
    img: {
        url: String,
        filename: String
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

// For fast search indexing
masterProductSchema.index({ name: 'text', brand: 'text', category: 'text' });
masterProductSchema.index({ name: 1, brand: 1 }, { unique: true });

module.exports = mongoose.model("MasterProduct", masterProductSchema);

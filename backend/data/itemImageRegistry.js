const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const itemImageRegistrySchema = new Schema({
    canonicalName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    itemCategory: {
        type: String,
        index: true
    },
    description: {
        type: String,
        default: ""
    },
    imageUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    locked: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Full-text or regex search index for displayName
itemImageRegistrySchema.index({ displayName: 'text' });

module.exports = mongoose.model("ItemImageRegistry", itemImageRegistrySchema);

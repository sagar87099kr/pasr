const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const shopSchema = new Schema({
    shopName: {
        type: String,
        required: true,
        maxlength: 50
    },
    shopDescription: {
        type: String,
        maxlength: 500,
        default: ""
    },
    shopImage: {
        type: Array, // [{url: "...", filename: "..."}]
        required: true
    },
    category: {
        type: String,
        required: true // e.g., "Grocery", "Electronics", etc.
    },
    location: {
        type: String, // Text address
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Customer"
    },
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [lng, lat]
            required: true
        }
    },
    verified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: String, // Admin name
        default: ""
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

shopSchema.index({ geometry: '2dsphere' });

const Shop = mongoose.model("Shop", shopSchema);
module.exports = Shop;
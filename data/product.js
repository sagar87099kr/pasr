const mongoose = require("mongoose");
const review = require("./review");
const { array, required } = require("joi");
const Schema = mongoose.Schema;

const productSchema = new Schema({
    categories: {
        type: String,
        required: true,
    },
    productImage: {
        type: Array,
        required: true,
    },
    productDescription: {
        type: String,
        maxlength: 500,
        default: "",
    },
    productName: {
        type: String,
        maxlength: 50,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Customer",
    },
    review: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    geometry: {
        type: {
            type: String, // Don't do `{ location: { type: String } }`
            enum: ['Point'], // 'location.type' must be 'Point'
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    verified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: String,
        default: "none",
        trim: true,
        maxlength: 60,
        minlength: 3,
    },
    price: {
        type: Number,
        required: true
    },
    hideListing: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }

});

productSchema.index({ geometry: '2dsphere' });
const Product = mongoose.model("Product", productSchema)
module.exports = Product;
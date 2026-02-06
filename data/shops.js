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
    items: [
        {
            type: Schema.Types.ObjectId,
            ref: "Item"
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

shopSchema.index({ geometry: '2dsphere' });

const Item = require("./item.js");
const Review = require("./review.js");
const { cloudinary } = require("../cloud_con.js");

shopSchema.post("findOneAndDelete", async function (shop) {
    if (shop) {
        // Delete all items associated with the shop
        if (shop.items.length) {
            // Find items that have images to delete from Cloudinary
            const items = await Item.find({ _id: { $in: shop.items } });
            for (let item of items) {
                if (item.img && item.img.filename) {
                    await cloudinary.uploader.destroy(item.img.filename);
                }
            }
            // Delete items from DB
            await Item.deleteMany({ _id: { $in: shop.items } });
        }

        // Delete all reviews associated with the shop
        if (shop.reviews.length) {
            await Review.deleteMany({ _id: { $in: shop.reviews } });
        }

        // Note: Shop image deletion is typically handled in the controller before this or can be here too
        // but routes/shops.js already handles it for strict control.
    }
});

const Shop = mongoose.model("Shop", shopSchema);
module.exports = Shop;
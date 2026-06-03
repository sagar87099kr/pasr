const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bazaarSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: ""
    },
    location: {
        type: String,
        default: ""
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
    radius: {
        type: Number,
        default: 5000 // Default 5km radius
    },
    image: {
        type: String,
        default: ""
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

bazaarSchema.index({ geometry: '2dsphere' });

const Bazaar = mongoose.model("Bazaar", bazaarSchema);
module.exports = Bazaar;

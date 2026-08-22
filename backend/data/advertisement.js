const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    imageId: { type: String, required: true }, // Cloudinary public ID for deletion
    link: { type: String, default: "" }, // Optional external link
    phoneNumber: { type: String, default: "" }, // Optional phone number
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Advertisement", advertisementSchema);

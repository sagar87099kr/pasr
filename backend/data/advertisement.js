const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    imageId: { type: String, default: "" }, // Cloudinary public ID for deletion
    link: { type: String, default: "" }, // Optional external link
    phoneNumber: { type: String, default: "" }, // Optional phone number
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null }, // Optional end time (null means runs indefinitely)
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Advertisement", advertisementSchema);


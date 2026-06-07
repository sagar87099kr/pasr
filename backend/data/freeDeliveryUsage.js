const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Tracks which mobile numbers have already used their one free home-delivery.
 * Keyed by mobile number (same as Customer.username) so it persists across
 * account deletions and re-registrations with the same number.
 */
const freeDeliveryUsageSchema = new Schema({
    mobile: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    usedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("FreeDeliveryUsage", freeDeliveryUsageSchema);

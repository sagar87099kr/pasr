const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// This lightweight autonomous schema tracks referral claims strictly by mobile number
// It ensures that even if a Customer completely deletes their account (killing their Mongoose _id),
// they can NEVER reclaim a referral sign-up bonus using the same phone number again.

const referralUsageSchema = new Schema({
    mobile: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    usedCode: { 
        type: String, 
        required: true 
    },
    usedAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model("ReferralUsage", referralUsageSchema);

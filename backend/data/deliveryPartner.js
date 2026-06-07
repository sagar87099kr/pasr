const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default;

const deliveryPartnerSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // Link to standard user
    fullName: { type: String, required: true },
    phoneNumber: { type: Number, required: true, unique: true },
    dateOfBirth: { type: Date, required: true },
    profilePhoto: { type: String }, // URL from cloudinary
    address: {
        street: String,
        city: String,
        state: String,
        pincode: Number
    },
    workLocation: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        serviceRadius: { type: Number, default: 5 } // in km
    },
    documents: {
        aadharFront: { type: String, required: true },
        aadharBack: { type: String, required: true },
        panCard: { type: String, required: true }
    },
    aadharNumber: { type: String, required: true },
    panNumber: { type: String, required: true },
    bankDetails: {
        accountNumber: String,
        ifscCode: String,
        upiId: String
    },
    vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'tempo', 'four_wheeler'], default: 'bike' },
    vehicleNumber: String,
    vehicleImage: { type: String }, // URL from cloudinary
    availableFrom: String, // HH:MM
    availableTo: String, // HH:MM
    workingDays: [String],
    isActive: { type: Boolean, default: false }, // Controlled by partner (toggle online/offline)
    isApproved: { type: Boolean, default: false }, // Controlled by Admin
    isBlocked: { type: Boolean, default: false }, // Controlled by Admin
    currentOrders: { type: Number, default: 0 },
    maxOrdersLimit: { type: Number, default: 2 },
    rating: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);

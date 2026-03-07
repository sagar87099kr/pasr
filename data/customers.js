const { string, required } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default;

const customerSchema = new Schema({
  name: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true,

  },
  username: {
    type: Number,
    required: true,
    maxlength: 10,
    minlength: 10,
    trim: true,
  },
  emailAddress: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    minLegth: 4,
    trim: true,
  },
  address: {
    type: String,
    maxlength: 300,
  },
  pincode: {
    type: Number,
    maxlength: 6,
  },
  geometry: {
    type: {
      type: String, // Don't do `{ location: { type: String } }`
      enum: ['Point'], // 'location.type' must be 'Point'
    },
    coordinates: {
      type: [Number],
    },
  },
  verified: {
    type: Boolean,
    default: true
  },
  verifedBy: {
    type: String,
    default: "WhatsApp OTP",
    trim: true,
    maxlength: 60,
    minlength: 3,
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  fcmToken: {
    type: String,
    default: null
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: "Customer",
    default: null
  },
  referralCount: {
    type: Number,
    default: 0
  },
  coins: {
    type: Number,
    default: 0
  }
});


customerSchema.plugin(passportLocalMongoose);

const Customer = mongoose.model("Customer", customerSchema)
module.exports = Customer;


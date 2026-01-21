const { string, required } = require("joi");
const mongoose= require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default;

const customerSchema= new Schema({
  name:{
    type: String,
    required: true,
    maxlength:50,
    trim: true,

  },
  username: {
    type: Number,
    required:true,
    maxlength:10,
    minlength:10,
    trim: true,
  },
  emailAddress:{
    type:String,
    trim:true,
  },
  password:{
    type: String,
    minLegth: 4,
    trim: true,
  },
  address:{
    type:String,
    required:true,
    maxlength:300,
  },
  pincode:{
    type:Number,
    required:true,
    maxlength:6,
  },
  geometry: {
    type: {
      type: String, // Don't do `{ location: { type: String } }`
      enum: ['Point'], // 'location.type' must be 'Point'
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    },
  },
  verified: {
     type: Boolean,
     default: false
     },
    verifedBy:{
      type:String,
      default:"none",
      trim:true,
      maxlength:60,
      minlength:3,
    },
  createdAt: { 
    type: Date,
    default: Date.now
  },
});

customerSchema.plugin(passportLocalMongoose);

const Customer = mongoose.model("Customer", customerSchema )
module.exports = Customer;


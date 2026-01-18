const mongoose= require("mongoose");
const review = require("./review");
const clander = require("./clander");
const { array, required } = require("joi");
const Schema = mongoose.Schema;

const providerSchema= new Schema({
  categories:{
    type:String,
    required: true,
  },
  personImage:{
      type : Array,
      required:true,
    },
   
  discription:{
    type:String,
    maxlength: 200,
    default:"",

  },
  experience:{
    type:Number,
    trim:true,
    default:1,
    required:true
    
  },
  company:{
    type:String,
    maxlength:50,
    required:true,

  },
  location:{
    type:String,
    required:true,

  },
  owner: {
    type:Schema.Types.ObjectId,
    required: true,
    ref:"Customer",
  },
  calendar: { 
    type: Schema.Types.ObjectId,
     ref: "Shedule",
      default: null },

  review:[
    {
      type:Schema.Types.ObjectId,
      ref:"Review"
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
  phoneNO:{
    type:Number,
    trim:true, 
    default:"",
  },

  createdAt: { 
    type: Date,
    default: Date.now
  }
});
 
const Provider = mongoose.model("Provider", providerSchema )
module.exports = Provider;


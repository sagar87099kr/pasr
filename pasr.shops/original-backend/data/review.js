const mongoose= require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema= new Schema({
    comment:{
    type: String,
    maxlength:300,
    trim: true,
    required:true
    },
  ratings:{
    type:Number,
    min:1,
    max:5,
    required:true

  },
  createdAt:{
    type: Date,
    default: Date.now()

  },
  author: {
    type:Schema.Types.ObjectId,
    required: true,
    ref:"Customer",
  },
  
});
module.exports =mongoose.model("Review", reviewSchema);

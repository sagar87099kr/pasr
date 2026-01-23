const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const daySchema = Schema(
  {
    date: { type: String, required: true }, // "YYYY-MM-DD"
    status: { type: String, enum: ["free", "busy"], required: true }
  },
  { _id: false }
);

const sheduleSchema = Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    days: { type: [daySchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shedule", sheduleSchema);
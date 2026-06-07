const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReportSchema = new Schema(
    {
        post: {
            type: Schema.Types.ObjectId,
            ref: "KeshanSabhaPost",
            required: true,
            index: true,
        },
        reportedBy: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        reason: {
            type: String,
            enum: ["spam", "misinformation", "inappropriate", "hate_speech", "other"],
            required: true,
        },
        details: {
            type: String,
            maxlength: 300,
            default: "",
            trim: true,
        },
        status: {
            type: String,
            enum: ["open", "reviewed", "dismissed"],
            default: "open",
        },
    },
    { timestamps: true }
);

// Prevent one user from reporting the same post multiple times
ReportSchema.index({ post: 1, reportedBy: 1 }, { unique: true });

module.exports = mongoose.model("KeshanSabhaReport", ReportSchema);

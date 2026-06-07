const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommentSchema = new Schema(
    {
        post: {
            type: Schema.Types.ObjectId,
            ref: "KeshanSabhaPost",
            required: true,
            index: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        text: {
            type: String,
            required: true,
            maxlength: [300, "Comment cannot exceed 300 characters"],
            trim: true,
        },
        // null = top-level comment; ObjectId = reply to that comment
        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "KeshanSabhaComment",
            default: null,
            index: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Fetch all comments for a post ordered chronologically, grouped by parent
CommentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });

module.exports = mongoose.model("KeshanSabhaComment", CommentSchema);

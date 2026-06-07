const mongoose = require("mongoose");
const { Schema } = mongoose;

const PostSchema = new Schema(
    {
        author: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            index: true,
        },

        // ── Content ──────────────────────────────────────────────
        description: {
            type: String,
            required: true,
            maxlength: [500, "Description cannot exceed 500 characters"],
            trim: true,
        },

        media: [
            {
                url: { type: String, required: true },      // Cloudinary secure_url
                filename: { type: String, required: true }, // Cloudinary public_id (for deletion)
                type: {
                    type: String,
                    enum: ["image", "video"],
                    default: "image",
                },
            },
        ],

        // ── Location ─────────────────────────────────────────────
        state: [{
            type: String
        }],
        districts: [{
            type: String
        }],
        locationName: {
            type: String,
            default: "Unknown Location",
        },
        geometry: {
            type: {
                type: String,
                enum: ['Point'],
            },
            coordinates: {
                type: [Number],
            },
        },

        // ── Admin Approval ────────────────────────────────────────
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true,
        },
        rejectionReason: {
            type: String,
            default: null,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },

        // ── Engagement ─────────────────────────────────────────────
        likes: {
            type: [{ type: Schema.Types.ObjectId, ref: "Customer" }],
            default: [],
        },
        likeCount: {
            type: Number,
            default: 0,
        },
        shareCount: {
            type: Number,
            default: 0,
        },
        commentCount: {
            type: Number,
            default: 0,
        },

        // ── Soft Delete ────────────────────────────────────────────
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    { timestamps: true }
);

// ── Compound indexes for common feed + filter queries ─────────
PostSchema.index({ geometry: "2dsphere" });
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model("KeshanSabhaPost", PostSchema);

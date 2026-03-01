const express = require("express");
const router = express.Router();
const Post = require("../data/keshanSabhaPost.js");
const Comment = require("../data/keshanSabhaComment.js");
const Report = require("../data/keshanSabhaReport.js");
const { isLogedin, isNotBlocked, isadmin } = require("../middeleware.js");
const Customer = require("../data/customers.js");
const wrapAsync = require("../utils/wrapAsync.js");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../cloud_con.js");
const statesDistricts = require("../data/statesDistricts.js");
const { reverseGeocode } = require("../utils/geocoder");
const { doubleCsrfProtection } = require("../utils/csrf");


// ── Cloudinary storage for images + videos ─────────────────────
const mediaStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "kisan_sabha",
        resource_type: "auto",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mov"],
        transformation: file.mimetype.startsWith("image/")
            ? [{ quality: "auto", fetch_format: "auto", width: 1080, crop: "limit" }]
            : [],
    }),
});
const upload = multer({ storage: mediaStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// (Removed static states/districts data requirement)

// ══════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════════════════════════

// GET  /kisan-sabha  → Feed page (approved posts, location-based filter)
router.get("/kisan-sabha", wrapAsync(async (req, res) => {
    let page = parseInt(req.query.page) || 1;
    const LIMIT = 10;
    let skip = (page - 1) * LIMIT;

    const filter = { status: "approved", isDeleted: false };
    let query = Post.find(filter).sort({ approvedAt: -1, createdAt: -1 });

    let allPosts = await query
        .populate("author", "name username")
        .select("-likes")
        .lean();

    // -- IN-MEMORY FILTER FOR STATE/DISTRICT TARGETING --
    let userState = null;
    let userDistrict = null;
    let locationMode = false;

    // Cache user location details if they are logged in and we haven't fetched it yet
    if (req.user && req.user.geometry && req.user.geometry.coordinates && req.user.geometry.coordinates.length === 2) {
        locationMode = true;
        try {
            const geoData = await reverseGeocode(req.user.geometry.coordinates);
            if (geoData.body.features && geoData.body.features.length > 0) {
                const contexts = geoData.body.features[0].context;
                // Google Maps maps District to administrative_area_level_3 or administrative_area_level_2
                const districtCtx = contexts.find(c => c.id.includes('administrative_area_level_3') || c.id.includes('administrative_area_level_2'));
                // Google Maps maps State to administrative_area_level_1
                const stateCtx = contexts.find(c => c.id.includes('administrative_area_level_1'));

                if (stateCtx) userState = stateCtx.text;
                if (districtCtx) userDistrict = districtCtx.text;

                // Special mapping check since Google string might have 'State' appended
                if (userState) userState = userState.replace(' State', '');
            }
        } catch (e) {
            console.error("Geocoding failed for feed filtering", e);
        }
    }

    const filteredPosts = allPosts.filter(post => {
        // If post has no state targeting, it's a global post, always show
        if (!post.state || post.state.length === 0 || post.state.includes("All")) {
            return true;
        }

        // If post Targets specific states, but user location is unknown, hide it
        if (!userState) return false;

        // Check if user's state is in the target list
        const stateMatch = post.state.some(s => s.toLowerCase() === userState.toLowerCase());
        if (!stateMatch) return false;

        // If 'All' districts is selected for that state, show it
        if (!post.districts || post.districts.length === 0 || post.districts.includes("All")) {
            return true;
        }

        // Check if user's district is in the target list
        if (!userDistrict) return false;

        // Exact or partial string match because google maps might return "North West Delhi" while dataset is "North West"
        return post.districts.some(d => d.toLowerCase().includes(userDistrict.toLowerCase()) || userDistrict.toLowerCase().includes(d.toLowerCase()));
    });

    const hasMore = filteredPosts.length > skip + LIMIT;
    const posts = filteredPosts.slice(skip, skip + LIMIT);

    res.render("pages/kisanSabha.ejs", {
        posts,
        hasMore,
        nextPage: page + 1,
        locationMode,
        statesDistricts
    });
}));

// GET  /kisan-sabha/:id  → Single post detail page
router.get("/kisan-sabha/:id", wrapAsync(async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, status: "approved", isDeleted: false })
        .populate("author", "name username")
        .lean();

    if (!post) {
        req.flash("danger", "Post not found or not approved yet.");
        return res.redirect("/kisan-sabha");
    }

    // Fetch top-level comments with their authors
    const comments = await Comment.find({ post: post._id, parentComment: null, isDeleted: false })
        .populate("author", "name username")
        .sort({ createdAt: 1 })
        .lean();

    // Fetch replies grouped by parentComment
    const commentIds = comments.map(c => c._id);
    const replies = await Comment.find({ parentComment: { $in: commentIds }, isDeleted: false })
        .populate("author", "name username")
        .sort({ createdAt: 1 })
        .lean();

    // Attach replies to their parent comment
    const replyMap = {};
    replies.forEach(r => {
        const pid = r.parentComment.toString();
        if (!replyMap[pid]) replyMap[pid] = [];
        replyMap[pid].push(r);
    });
    comments.forEach(c => { c.replies = replyMap[c._id.toString()] || []; });

    const liked = req.user
        ? (await Post.findById(post._id).select("likes").lean()).likes
            .some(id => id.toString() === req.user._id.toString())
        : false;

    res.render("pages/kisanSabhaPost.ejs", { post, comments, liked });
}));

// GET /kisan-sabha/:id/comments-ui → Isolated comments view for modal iframe
router.get("/kisan-sabha/:id/comments-ui", wrapAsync(async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, status: "approved", isDeleted: false }).lean();
    if (!post) {
        return res.status(404).send("Post not found");
    }

    const comments = await Comment.find({ post: post._id, parentComment: null, isDeleted: false })
        .populate("author", "name username")
        .sort({ createdAt: 1 })
        .lean();

    const commentIds = comments.map(c => c._id);
    const replies = await Comment.find({ parentComment: { $in: commentIds }, isDeleted: false })
        .populate("author", "name username")
        .sort({ createdAt: 1 })
        .lean();

    const replyMap = {};
    replies.forEach(r => {
        const pid = r.parentComment.toString();
        if (!replyMap[pid]) replyMap[pid] = [];
        replyMap[pid].push(r);
    });
    comments.forEach(c => { c.replies = replyMap[c._id.toString()] || []; });

    res.render("pages/kisanSabhaCommentsOnly.ejs", { post, comments, currUser: req.user });
}));

// ══════════════════════════════════════════════════════════════════
//  AUTHENTICATED USER ROUTES
// ══════════════════════════════════════════════════════════════════

// POST  /kisan-sabha  → Submit new post (pending admin approval)
router.post("/kisan-sabha", isLogedin, isNotBlocked, doubleCsrfProtection, upload.array("media", 1), wrapAsync(async (req, res) => {

    const { description } = req.body;

    const media = (req.files || []).map(f => ({
        url: f.path,
        filename: f.filename,
        type: f.mimetype.startsWith("video/") ? "video" : "image",
    }));

    let locationName = "Current Location";
    if (req.user && req.user.address) {
        locationName = req.user.address;
    }

    let geometry;
    if (req.user && req.user.geometry && req.user.geometry.type === 'Point') {
        geometry = req.user.geometry;
    }

    let stateArr = [];
    if (req.body.state) {
        stateArr = Array.isArray(req.body.state) ? req.body.state : [req.body.state];
    }

    let districtArr = [];
    if (req.body.district) {
        districtArr = Array.isArray(req.body.district) ? req.body.district : [req.body.district];
    }

    const post = new Post({
        author: req.user._id,
        description,
        locationName,
        geometry,
        state: stateArr,
        districts: districtArr,
        media,
        status: "pending",
    });

    await post.save();
    req.flash("success", "Your post has been submitted and is awaiting admin approval.");
    res.redirect("/kisan-sabha");
}));

// GET  /kisan-sabha/my-posts  → User's own posts (all statuses)
router.get("/kisan-sabha/my-posts", isLogedin, wrapAsync(async (req, res) => {
    const posts = await Post.find({ author: req.user._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .lean();
    res.render("pages/kisanSabhaMyPosts.ejs", { posts });
}));

// DELETE  /kisan-sabha/:id  → Delete own post
router.delete("/kisan-sabha/:id", isLogedin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    if (!post) {
        req.flash("danger", "Post not found or not authorized.");
        return res.redirect("/kisan-sabha");
    }
    // Delete media from Cloudinary
    for (const m of post.media) {
        if (m.filename) await cloudinary.uploader.destroy(m.filename, { resource_type: m.type === "video" ? "video" : "image" });
    }

    // Delete all linked comments and reports
    await Comment.deleteMany({ post: post._id });
    await Report.deleteMany({ post: post._id });

    // Hard delete post
    await Post.findByIdAndDelete(post._id);

    req.flash("success", "Post deleted successfully.");
    res.redirect("/kisan-sabha");
}));

// POST  /kisan-sabha/:id/like  → Toggle like
router.post("/kisan-sabha/:id/like", isLogedin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const post = await Post.findOne({ _id: req.params.id, status: "approved", isDeleted: false }).select("likes likeCount");
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const userId = req.user._id;
    const alreadyLiked = post.likes.some(id => id.equals(userId));

    if (alreadyLiked) {
        await Post.findByIdAndUpdate(post._id, { $pull: { likes: userId }, $inc: { likeCount: -1 } });
        return res.json({ success: true, liked: false, likeCount: post.likeCount - 1 });
    } else {
        await Post.findByIdAndUpdate(post._id, { $addToSet: { likes: userId }, $inc: { likeCount: 1 } });
        return res.json({ success: true, liked: true, likeCount: post.likeCount + 1 });
    }
}));

// POST  /kisan-sabha/:id/share  → Increment share counter
router.post("/kisan-sabha/:id/share", isLogedin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { shareCount: 1 } }, { new: true }).select("shareCount");
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    res.json({ success: true, shareCount: post.shareCount });
}));

// POST  /kisan-sabha/:id/comments  → Add top-level comment
router.post("/kisan-sabha/:id/comments", isLogedin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const { text } = req.body;
    const post = await Post.findOne({ _id: req.params.id, status: "approved", isDeleted: false });
    if (!post) {
        req.flash("danger", "Post not found.");
        return res.redirect("/kisan-sabha");
    }
    await Comment.create({ post: post._id, author: req.user._id, text, parentComment: null });
    await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });
    res.redirect(`/kisan-sabha/${post._id}/comments-ui`);
}));

// POST  /kisan-sabha/:id/comments/:cid/reply  → Reply to a comment
router.post("/kisan-sabha/:id/comments/:cid/reply", isLogedin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const { text } = req.body;
    const parent = await Comment.findById(req.params.cid);
    if (!parent) {
        req.flash("danger", "Comment not found.");
        return res.redirect(`/kisan-sabha/${req.params.id}`);
    }
    await Comment.create({ post: parent.post, author: req.user._id, text, parentComment: parent._id });
    await Post.findByIdAndUpdate(parent.post, { $inc: { commentCount: 1 } });
    res.redirect(`/kisan-sabha/${req.params.id}/comments-ui`);
}));

// DELETE  /kisan-sabha/comments/:cid  → Delete own comment
router.delete("/kisan-sabha/comments/:cid", isLogedin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const comment = await Comment.findOne({ _id: req.params.cid, author: req.user._id });
    if (!comment) {
        req.flash("danger", "Comment not found or not authorized.");
        return res.redirect("/kisan-sabha");
    }
    await Comment.findByIdAndUpdate(comment._id, { isDeleted: true });
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });
    res.redirect(`/kisan-sabha/${comment.post}/comments-ui`);
}));

// POST  /kisan-sabha/:id/report  → Report a post
router.post("/kisan-sabha/:id/report", isLogedin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const { reason, details } = req.body;
    try {
        await Report.create({ post: req.params.id, reportedBy: req.user._id, reason, details });
        req.flash("success", "Report submitted. Thank you for keeping the community safe.");
    } catch (err) {
        if (err.code === 11000) {
            req.flash("danger", "You have already reported this post.");
        } else {
            throw err;
        }
    }
    res.redirect(`/kisan-sabha/${req.params.id}`);
}));

// ══════════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════════════════

// GET  /admin/kisan-sabha  → Admin panel: view pending + all posts
router.get("/admin/kisan-sabha", isLogedin, isadmin, wrapAsync(async (req, res) => {
    const { tab = "pending" } = req.query;
    const filter = tab === "all"
        ? { isDeleted: false }
        : { status: "pending", isDeleted: false };

    const posts = await Post.find(filter)
        .sort({ createdAt: -1 })
        .populate("author", "name username")
        .lean();

    const reports = await Report.find({ status: "open" })
        .populate("post", "description status")
        .populate("reportedBy", "name username")
        .lean();

    res.render("pages/kisanSabhaAdmin.ejs", { posts, reports, tab });
}));

// PUT  /admin/kisan-sabha/:id/approve  → Approve a post
router.put("/admin/kisan-sabha/:id/approve", isLogedin, isadmin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    await Post.findByIdAndUpdate(req.params.id, {
        status: "approved",
        approvedBy: req.user._id,
        approvedAt: new Date(),
    });
    req.flash("success", "Post approved and now live.");
    res.redirect("/admin/kisan-sabha");
}));

// PUT  /admin/kisan-sabha/:id/reject  → Reject with reason
router.put("/admin/kisan-sabha/:id/reject", isLogedin, isadmin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const { reason } = req.body;
    await Post.findByIdAndUpdate(req.params.id, { status: "rejected", rejectionReason: reason });
    req.flash("success", "Post rejected.");
    res.redirect("/admin/kisan-sabha");
}));

// DELETE  /admin/kisan-sabha/:id  → Hard delete any post (admin)
router.delete("/admin/kisan-sabha/:id", isLogedin, isadmin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const post = await Post.findById(req.params.id);
    if (post) {
        for (const m of post.media) {
            if (m.filename) await cloudinary.uploader.destroy(m.filename, { resource_type: m.type === "video" ? "video" : "image" });
        }

        // Delete all linked comments and reports
        await Comment.deleteMany({ post: post._id });
        await Report.deleteMany({ post: post._id });

        await Post.findByIdAndDelete(post._id);
    }
    req.flash("success", "Post permanently deleted.");
    res.redirect("/admin/kisan-sabha");
}));

// PUT  /admin/kisan-sabha/block-user/:authorId  → Block User permanently
router.put("/admin/kisan-sabha/block-user/:authorId", isLogedin, isadmin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    await Customer.findByIdAndUpdate(req.params.authorId, { isBlocked: true });
    req.flash("success", "User has been permanently blocked from posting, selling, and reviewing.");
    res.redirect("/admin/kisan-sabha");
}));

// PUT  /admin/kisan-sabha/reports/:rid  → Update report status
router.put("/admin/kisan-sabha/reports/:rid", isLogedin, isadmin, doubleCsrfProtection, wrapAsync(async (req, res) => {

    const { status } = req.body;
    await Report.findByIdAndUpdate(req.params.rid, { status });
    req.flash("success", "Report status updated.");
    res.redirect("/admin/kisan-sabha");
}));

module.exports = router;

const express = require("express");
const router = express.Router();
const Shop = require("../data/shops.js");
const Review = require("../data/review.js");
const { isLogedin, isOwner, validateShop, isadmin, validatereview, isReviewAuthor } = require("../middeleware.js"); // Using generic middlewares where applicable
const wrapAsync = require("../utils/wrapAsync.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const multer = require("multer");
const { storage, cloudinary } = require("../cloud_con.js");
const upload = multer({ storage });

// Define a middleware specifically for Shop ownership if isOwner is strictly for Providers
// Looking at middleware.js: isOwner checks Provider. isProductOwner checks Product.
// We need isShopOwner.
const isShopOwner = async (req, res, next) => {
    try {
        let { id } = req.params;
        const shop = await Shop.findById(id);
        if (!shop) {
            req.flash("danger", "Shop not found");
            return res.redirect("/shops");
        }
        if (res.locals.currUser && !shop.owner.equals(res.locals.currUser._id)) {
            req.flash("danger", "You are not the owner of this shop.");
            return res.redirect(`/shops/${id}`);
        }
        next();
    } catch (e) {
        next(e);
    }
};

// Shop Verification Route (Admin Only)
router.get("/shops/verify", isLogedin, isadmin, wrapAsync(async (req, res) => {
    // Fetch all shops to display pending and verified
    const shops = await Shop.find({}).populate('owner');
    res.render("pages/shopVerification.ejs", { shops });
}));

// Verify Shop Action
router.put("/shops/:id/verify", isLogedin, isadmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { verifiedBy } = req.body;
    const shop = await Shop.findByIdAndUpdate(id, { verified: true, verifiedBy });
    req.flash("success", "Shop verified successfully");
    res.redirect("/shops/verify");
}));

// Fail/Delete Shop Action
router.delete("/shops/:id/verifyfail", isLogedin, isadmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const shop = await Shop.findById(id);
    if (shop.shopImage) {
        for (let img of shop.shopImage) {
            await cloudinary.uploader.destroy(img.filename);
        }
    }
    await Shop.findByIdAndDelete(id);
    req.flash("success", "Shop verification failed and deleted");
    res.redirect("/shops/verify");
}));

// Index Route - List Shops
router.get("/shops", isLogedin, wrapAsync(async (req, res) => {
    let { lat, lng, range } = req.query;
    let shops = [];
    range = parseInt(range) || 5;
    if (range > 5) range = 5;

    // Use user's saved location if query params are missing and user is logged in
    if ((!lat || !lng) && req.user && req.user.geometry && req.user.geometry.coordinates) {
        lng = req.user.geometry.coordinates[0];
        lat = req.user.geometry.coordinates[1];
    }

    if (lat && lng) {
        let query = {
            verified: true, // Assuming we only show verified shops? Or maybe all for now since default is false?
            // Let's assume initially we might want to show unverified if there's no verification process yet, 
            // OR strictly follow the pattern. localMarket.js uses verified: true.
            // But wait, if verified default is false, users won't see their created shops.
            // For now, let's allow unverified or check how localMarket handles it. 
            // localMarket product schema has verified: false default.
            // And index route filters verified: true. 
            // So products must be verified by admin? 
            // In localMarket.js: router.put("/:id/verifyproduct", ... isadmin ...)
            // Use verified: true for consistency, but might need an admin route to verify.
            // OR, for "Local Shops", maybe auto-verify? 
            // User requested "same as local market", so I will stick to verified: true logic and maybe add admin verify later 
            // OR just comment it out for testing if needed. 
            // For now, I will Comment out verified: true to allow immediate visibility for testing, 
            // or better yet, default verified to true in the creation if no admin process exists yet for shops.
            // Actually, let's keep it consistent: verified: true.
            // But wait, if I can't verify myself as admin easily, I'll be blocked.
            // Let's check middleware.js admins list. User might be admin.
            // I'll leave verified: true in query but default new shops to verified: false, 
            // UNLESS I see an auto-verify pattern.
            // localMarket.js: product.verified default false.
            // I'll stick to that.

            geometry: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: range * 1000
                }
            }
        };

        // If 'verified' field exists in schema and is false by default, I should probably filter by it.
        // However, if I want to see my just-created shop, I might be confused.
        // I will temporarily allow all verified status for shops to ensure the user can see creation working,
        // unless I strictly implement the verification flow.
        // Let's look at localMarket.js again. 'verified: true'. 
        // I'll copy that.
        query.verified = true;

        if (req.query.category && req.query.category !== 'All Shops') {
            query.category = req.query.category;
        }

        shops = await Shop.find(query).populate('owner');
    }

    res.render("pages/shops.ejs", { shops, lat, lng, range });
}));

// New Shop Form
router.get("/shops/new", isLogedin, (req, res) => {
    res.render("pages/shopNew.ejs");
});

// Create Shop
router.post("/shops", isLogedin, upload.single("shopImage"), validateShop, wrapAsync(async (req, res) => {
    const shopData = req.body.shop;
    const geoData = await geocodingClient.forwardGeocode({
        query: shopData.location,
        limit: 1,
    }).send();

    const shop = new Shop(shopData);
    shop.geometry = geoData.body.features[0].geometry;
    shop.owner = req.user._id;
    // For strictly following local market which requires admin verification, we set verified to false by default.
    // User requested verification route, implying manual verification flow.
    shop.verified = false;

    if (req.file) {
        // Store as array for schema consistency if schema expects array, 
        // OR as single object if schema expects single. 
        // Based on previous code `shop.shopImage = req.files.map...`, it expects an array.
        // Even with single image, we can push to array for future flexibility 
        // OR compatibility with existing `shopDetail.ejs` (which probably iterates).
        shop.shopImage = [{ url: req.file.path, filename: req.file.filename }];
    }

    await shop.save();
    req.flash("success", "Shop registered successfully!");
    res.redirect("/shops");
}));

// Show Shop Detail
router.get("/shops/:id", isLogedin, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const shop = await Shop.findById(id)
        .populate("owner")
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        });
    if (!shop) {
        req.flash("error", "Shop not found");
        return res.redirect("/shops");
    }
    res.render("pages/shopDetail.ejs", { shop });
}));

// Create Review Route
router.post("/shops/:id/reviews", isLogedin, validatereview, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let shop = await Shop.findById(id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    shop.reviews.push(newReview);
    await newReview.save();
    await shop.save();
    req.flash("success", "New review created");
    res.redirect(`/shops/${id}`);
}));

const isShopReviewAuthor = async (req, res, next) => {
    try {
        let { id, reviewId } = req.params;
        let review = await Review.findById(reviewId);
        if (!review) {
            req.flash("danger", "Review not found");
            return res.redirect(`/shops/${id}`);
        }
        if (res.locals.currUser && !review.author.equals(res.locals.currUser._id)) {
            req.flash("danger", "Only review owner can delete this review.");
            return res.redirect(`/shops/${id}`);
        }
        next();
    } catch (e) {
        next(e);
    }
};

// Delete Review Route
router.delete("/shops/:id/reviews/:reviewId", isLogedin, isShopReviewAuthor, wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Shop.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review deleted");
    res.redirect(`/shops/${id}`);
}));

// Edit Shop Form
router.get("/shops/:id/edit", isLogedin, isShopOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const shop = await Shop.findById(id);
    if (!shop) {
        req.flash("error", "Shop not found");
        return res.redirect("/shops");
    }
    res.render("pages/shopEdit.ejs", { shop }); // Need to create this view or reuse/adjust
}));

// Update Shop
router.put("/shops/:id", isLogedin, isShopOwner, validateShop, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const { shopName, shopDescription, category, location } = req.body.shop;

    // Geocode the new location
    const geoData = await geocodingClient.forwardGeocode({
        query: location,
        limit: 1,
    }).send();

    const geometry = geoData.body.features[0].geometry;

    await Shop.findByIdAndUpdate(id, { shopName, shopDescription, category, location, geometry });

    req.flash("success", "Shop updated successfully");
    res.redirect(`/shops/${id}`);
}));

// Delete Shop
router.delete("/shops/:id", isLogedin, isShopOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const shop = await Shop.findById(id);

    if (shop.shopImage) {
        for (let img of shop.shopImage) {
            await cloudinary.uploader.destroy(img.filename);
        }
    }

    await Shop.findByIdAndDelete(id);
    req.flash("success", "Shop deleted successfully");
    res.redirect("/shops");
}));

module.exports = router;

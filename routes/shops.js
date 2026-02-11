const express = require("express");
const router = express.Router();
const Shop = require("../data/shops.js");
const Review = require("../data/review.js");
const Item = require("../data/item.js");
const { isLogedin, isOwner, validateShop, isadmin, validatereview, isReviewAuthor, validateItem } = require("../middeleware.js"); // Using generic middlewares where applicable
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
    range = parseInt(range) || 10;
    if (range > 10) range = 10;

    // Priority 1: Query params (lat, lng from URL)
    // Priority 2: Session location (from browser geolocation)
    // Priority 3: User profile location
    if (!lat || !lng) {
        // Check session location first
        if (req.session.location && req.session.location.coordinates && req.session.location.coordinates.length === 2) {
            lng = req.session.location.coordinates[0];
            lat = req.session.location.coordinates[1];
        }
        // Fall back to user's saved location
        else if (req.user && req.user.geometry && req.user.geometry.coordinates) {
            lng = req.user.geometry.coordinates[0];
            lat = req.user.geometry.coordinates[1];
        }
    }

    if (lat && lng) {
        let query = {
            geometry: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: range * 1000 // Convert km to meters
                }
            }
        };

        // Filter by category if specified
        if (req.query.category && req.query.category !== 'All Shops') {
            query.category = req.query.category;
        }

        // Filter by opening hours if "Open Now" is checked
        if (req.query.openNow === 'true') {
            const now = new Date();
            const options = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' };
            const currentTime = now.toLocaleTimeString('en-US', options);
            query.openingTime = { $lte: currentTime };
            query.closingTime = { $gte: currentTime };
        }

        shops = await Shop.find(query).populate('owner');
        console.log(`Found ${shops.length} shops within ${range}km of (${lat}, ${lng})`);
    }

    res.render("pages/shops.ejs", { shops, lat, lng, range, queryParams: req.query });
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
router.get("/shops/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const shop = await Shop.findById(id)
        .populate("owner")
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        })
        .populate("items");
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


// Create Item
router.post("/shops/:id/items", isLogedin, isShopOwner, upload.single("itemImage"), validateItem, wrapAsync(async (req, res) => {
    console.log("Create Item Route Hit");
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const { id } = req.params;
    const shop = await Shop.findById(id);
    if (!shop) {
        req.flash("error", "Shop not found");
        return res.redirect("/shops");
    }

    const itemData = req.body.item;
    const newItem = new Item(itemData);

    if (req.file) {
        newItem.img = { url: req.file.path, filename: req.file.filename };
    }

    newItem.shop = shop._id;
    shop.items.push(newItem);

    await newItem.save();
    await shop.save();

    req.flash("success", "Your item was added");
    res.redirect(`/shops/${id}`);
}));

// Delete Item
router.delete("/shops/:id/items/:itemId", isLogedin, isShopOwner, wrapAsync(async (req, res) => {
    const { id, itemId } = req.params;
    const item = await Item.findById(itemId);

    if (item.img && item.img.filename) {
        await cloudinary.uploader.destroy(item.img.filename);
    }

    await Shop.findByIdAndUpdate(id, { $pull: { items: itemId } });
    await Item.findByIdAndDelete(itemId);

    req.flash("success", "Item deleted successfully");
    res.redirect(`/shops/${id}`);
}));

// Upload/Update UPI Scanner
router.put("/shops/:id/upi", isLogedin, isShopOwner, upload.single("upiImage"), wrapAsync(async (req, res) => {
    const { id } = req.params;
    const shop = await Shop.findById(id);

    if (req.file) {
        // If existing UPI image exists, delete it from cloud
        if (shop.upiScanner && shop.upiScanner.filename) {
            await cloudinary.uploader.destroy(shop.upiScanner.filename);
        }
        shop.upiScanner = { url: req.file.path, filename: req.file.filename };
        await shop.save();
        req.flash("success", "UPI Scanner updated successfully");
    } else {
        req.flash("error", "No image uploaded");
    }
    res.redirect(`/shops/${id}`);
}));

// Delete UPI Scanner
router.delete("/shops/:id/upi", isLogedin, isShopOwner, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const shop = await Shop.findById(id);

    if (shop.upiScanner && shop.upiScanner.filename) {
        await cloudinary.uploader.destroy(shop.upiScanner.filename);
        shop.upiScanner = undefined;
        await shop.save();
        req.flash("success", "UPI Scanner removed");
    } else {
        req.flash("error", "No UPI Scanner to remove");
    }
    res.redirect(`/shops/${id}`);
}));

module.exports = router;

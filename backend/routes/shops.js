const express = require("express");
const router = express.Router();
const Shop = require("../data/shops.js");
const Review = require("../data/review.js");
const Item = require("../data/item.js");
const Order = require("../data/order.js");
const { isLogedin, isNotBlocked, isOwner, validateShop, isadmin, validatereview, isReviewAuthor, validateItem, isVerifiedCustomer } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { forwardGeocode } = require("../utils/geocoder");
const { storage, cloudinary, upload, itemUpload } = require("../cloud_con.js");
const ItemImageRegistry = require("../data/itemImageRegistry");
const { normalizeItemName } = require("../utils/normalization");
const MasterProduct = require("../data/masterProduct");
const TransactionHistory = require("../data/transactionHistory.js");
const { verifyGST } = require("../utils/gstHelper");
const SHOP_CATEGORIES = require("../data/categories");

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
    const shops = await Shop.find({}).populate('owner').populate('bazaar');
    const bazaars = await require("../data/bazaar").find({}).sort({ name: 1 });
    res.render("pages/shopVerification.ejs", { shops, bazaars });
}));

// Verify Shop Action
router.put("/shops/:id/verify", isLogedin, isadmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { verifiedBy, bazaarId } = req.body;
    
    // Determine if shop was previously unverified
    const previousShopState = await Shop.findById(id);
    const wasUnverified = !previousShopState.verified;

    const updateData = { verified: true, verifiedBy };
    if (bazaarId) {
        updateData.bazaar = bazaarId;
    }

    const shop = await Shop.findByIdAndUpdate(id, updateData, { new: true });
    
    // Broadcast notification to nearby customers (3km radius)
    if (wasUnverified && shop.geometry && shop.geometry.coordinates && shop.geometry.coordinates.length === 2) {
        const Customer = require("../data/customers");
        const { createNotification } = require("../utils/notificationHelper");
        const distanceUtil = require("../utils/distance");
        
        const shopLng = shop.geometry.coordinates[0];
        const shopLat = shop.geometry.coordinates[1];
        const imageUrl = shop.shopImage && shop.shopImage.url ? shop.shopImage.url : null;
        
        const allCustomers = await Customer.find({ "geometry.coordinates": { $exists: true, $ne: [] } });
        
        for (const customer of allCustomers) {
            const custLng = customer.geometry.coordinates[0];
            const custLat = customer.geometry.coordinates[1];
            
            const dist = distanceUtil.calculateDistance(shopLat, shopLng, custLat, custLng);
            if (dist <= 3.0) {
                if (typeof createNotification === 'function') {
                    await createNotification(
                        customer._id,
                        'GENERAL',
                        null,
                        'New Shop Alert!',
                        `This ${shop.shopName} of shop has registered to PASR!`,
                        imageUrl
                    );
                }
            }
        }
    }

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

// API: GST Lookup
router.get("/api/v1/gst-lookup", isLogedin, wrapAsync(async (req, res) => {
    const { gstin } = req.query;
    if (!gstin) {
        return res.status(400).json({ valid: false, message: "GSTIN is required" });
    }
    const result = await verifyGST(gstin);
    res.json(result);
}));

// Index Route - List Shops
router.get("/shops", wrapAsync(async (req, res) => {
    let { lat, lng, range } = req.query;
    let shops = [];
    range = parseInt(range) || 5;
    if (range > 10) range = 10;

    // Priority 1: Bazaar Location (from Mobile App headers)
    // Priority 2: Bazaar Location (from Web App session)
    // Priority 3: Query params (lat, lng from URL)
    // Priority 4: Session location (from browser geolocation)
    // Priority 5: User profile location
    
    let bazaarId = null;

    if (req.headers['x-bazaar-id']) {
        bazaarId = req.headers['x-bazaar-id'];
    } else if (req.session.bazaarId) {
        bazaarId = req.session.bazaarId;
    } else if (req.headers['x-bazaar-lat'] && req.headers['x-bazaar-lng']) {
        lng = parseFloat(req.headers['x-bazaar-lng']);
        lat = parseFloat(req.headers['x-bazaar-lat']);
    } else if (req.session.bazaarLocation && req.session.bazaarLocation.coordinates) {
        lng = req.session.bazaarLocation.coordinates[0];
        lat = req.session.bazaarLocation.coordinates[1];
    } else if (!lat || !lng) {
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

    let query = { verified: true };
    
    if (bazaarId) {
        query.bazaar = bazaarId;
    } else if (lat && lng) {
        query.geometry = {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [parseFloat(lng), parseFloat(lat)]
                },
                $maxDistance: range * 1000 // Convert km to meters
            }
        };
    }

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

    // Check total verified shops first
    const totalVerifiedShops = await Shop.countDocuments({ verified: true });

    // Check if any shops have geometry
    const shopsWithGeometry = await Shop.countDocuments({
        verified: true,
        'geometry.coordinates': { $exists: true, $ne: [] }
    });

    shops = await Shop.find(query).sort({ isSponsored: -1 }).populate('owner').populate('reviews');

        // Prioritize owned shop to the top
        if (req.user) {
            const Order = require("../data/order.js");
            shops.sort((a, b) => {
                const aIsOwner = a.owner && a.owner._id.equals(req.user._id);
                const bIsOwner = b.owner && b.owner._id.equals(req.user._id);
                if (aIsOwner && !bIsOwner) return -1;
                if (!aIsOwner && bIsOwner) return 1;
                return 0;
            });

            // For owned shops, check if they have pending orders
            const pendingOrderShops = await Order.find({
                shopId: { $in: shops.filter(s => s.owner && s.owner._id.equals(req.user._id)).map(s => s._id) },
                orderStatus: 'CREATED'
            }).distinct('shopId');

            const pendingShopIds = pendingOrderShops.map(id => id.toString());

            shops = shops.map(shop => {
                const shopObj = shop.toObject();
                if (req.user && shop.owner && shop.owner._id.equals(req.user._id)) {
                    shopObj.hasPendingOrders = pendingShopIds.includes(shop._id.toString());
                } else {
                    shopObj.hasPendingOrders = false;
                }
                return shopObj;
            });
        }


    if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.json({ success: true, shops });
    }

    res.render("pages/shops.ejs", { shops, lat, lng, range, queryParams: req.query });
}));

// New Shop Form
router.get("/shops/new", isLogedin, isVerifiedCustomer, (req, res) => {
    res.render("pages/shopNew.ejs");
});

// Create Shop
router.post("/shops", isLogedin, isNotBlocked, upload.single("shopImage"), validateShop, wrapAsync(async (req, res) => {

    const shopData = req.body.shop;
    const geoData = await forwardGeocode(shopData.location);

    const shop = new Shop(shopData);
    shop.geometry = geoData.body.features[0].geometry;
    shop.owner = req.user._id;
    shop.verified = false;

    if (req.file) {
        shop.shopImage = [{ url: req.file.path, filename: req.file.filename }];
    }

    await shop.save();

    // SEEDING: If it's a Grocery shop, add template items
    if (shop.category === "Grocery") {
        const Item = require("../data/item.js");
        const groceryTemplates = require("../data/groceryTemplates");
        for (let template of groceryTemplates) {
            const newItem = new Item({
                ...template,
                price: 0,
                quantity: 0,
                shop: shop._id
            });
            await newItem.save();
            shop.items.push(newItem._id);
        }
        await shop.save();
    }

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
        .populate({
            path: "items",
            populate: { path: "product" }
        });

    if (!shop) {
        req.flash("error", "Shop not found");
        return res.redirect("/shops");
    }

    const isOwner = req.user && shop.owner._id.equals(req.user._id);

    // Shop open/closed status is now handled in the template and cart controller
    // instead of a hard redirect, allowing customers to browse items anytime.

    if (isOwner) {
        // Owner View: Show MasterProducts relevant to this shop's category in the grid.
        // Note: The image SEARCH (when typing in Add Item) is unfiltered — see itemRegistry.js
        let masterQuery = { isActive: true };

        if (shop.category === "Grocery") {
            const grocerySubCats = [
                "Grocery", "Staples & Grains", "Edible Oil & Ghee",
                "Spices & Masala", "Snacks & Namkeen", "Beverages",
                "Dairy & Refrigerator", "Bakery Items", "Personal Care",
                "Home Cleaning & Household", "Baby Care", "Dry Fruits & Sweets",
                "Instant & Ready to Eat"
            ];
            masterQuery.category = { $in: grocerySubCats };
        } else if (shop.category === "General Store") {
            const generalStoreSubCats = [
                "General Store", "Daily Essentials", "Snacks & Beverages", "Personal Care",
                "Household Items", "Stationery", "Cleaning Supplies",
                "Baby Care", "Snacks & Namkeen"
            ];
            masterQuery.category = { $in: generalStoreSubCats };
        } else {
            // For all other categories (Footwear, Sweet Shop, Restaurant, etc.)
            // show NO pre-loaded master products — they use image search to find items
            masterQuery._id = null; // match nothing
        }

        const masterProducts = await MasterProduct.find(masterQuery).lean();

        // 2. Create a map of existing items by product ID
        const inventoryMap = {};
        shop.items.forEach(item => {
            if (item.product) {
                inventoryMap[item.product._id.toString()] = item;
            }
        });

        // 3. Merge: Every master product should appear. 
        const mergedItems = masterProducts.map(mp => {
            const existing = inventoryMap[mp._id.toString()];
            if (existing) {
                return {
                    ...existing.toObject(),
                    product: mp,
                    isVirtual: false
                };
            } else {
                return {
                    product: mp,
                    price: 0,
                    quantity: 0,
                    isVirtual: true,
                    shop: shop._id
                };
            }
        });

        // Also add any "custom" items that don't have a MasterProduct
        shop.items.forEach(item => {
            if (!item.product) {
                mergedItems.push({
                    ...item.toObject(),
                    isVirtual: false,
                    isCustom: true
                });
            }
        });

        // [STRICT IMAGE FILTER] Only show items with images, or if it is a real item owned by the shop (so the owner can see and fix missing images)
        const filteredMergedItems = mergedItems
            .filter(item => {
                const hasImg = (item.img && item.img.url) || (item.product && item.product.img && item.product.img.url);
                // The user requested not to show pre-populated 0 price and 0 quantity items directly
                if (item.price === 0 && item.quantity === 0) return false;
                return !!hasImg || !item.isVirtual;
            })
            .sort((a, b) => {
                const aVal = a.quantity > 0 ? 1 : 0;
                const bVal = b.quantity > 0 ? 1 : 0;
                return bVal - aVal;
            });

        // Query active orders for this shop
        const activeOrderCount = await Order.countDocuments({
            shopId: shop._id,
            orderStatus: { $in: ['CREATED', 'ACCEPTED', 'READY_FOR_DELIVERY', 'BROADCAST', 'ASSIGNED', 'OUT_FOR_DELIVERY'] }
        });

        // Calculate Financial Ledger Balances
        const unsettledOrders = await Order.find({
            shopId: shop._id,
            orderStatus: 'COMPLETED',
            settlementStatus: { $in: ['PENDING', 'REQUESTED'] }
        });

        let totalPendingPayout = 0; // PASR owes Shop (Available)
        let totalRequestedPayout = 0; // PASR owes Shop (Requested but not paid)
        let totalDueToPasr = 0;     // Shop owes PASR (Cumulative pending for these orders)

        unsettledOrders.forEach(order => {
            let earningsForShop = 0; // Net balance for this specific order

            const isSelfPickup = !!order.selfDelivery || order.deliveryType === 'Self Pickup';
            const actualItemPrice = order.subtotalAmount || ((order.totalAmount || 0) + (order.coinDiscount || 0));

            if (isSelfPickup) {
                if (order.paymentType === 'PREPAID') {
                    earningsForShop = actualItemPrice;
                    if (order.deliveryType === 'HOME_DELIVERY') {
                        earningsForShop += (order.deliveryCharge || 0);
                    }
                    earningsForShop -= (order.pasrCommission || 0);
                } else {
                    earningsForShop = (order.coinDiscount || 0) - (order.pasrCommission || 0);
                }
            } else {
                earningsForShop = actualItemPrice;
            }

            // Categorize the net result
            if (earningsForShop > 0) {
                if (order.settlementStatus === 'REQUESTED') {
                    totalRequestedPayout += earningsForShop;
                } else {
                    totalPendingPayout += earningsForShop;
                }
            } else if (earningsForShop < 0) {
                // Only count debt for orders still in PENDING status
                // (Requested doesn't really apply to debt, but we check for safety)
                if (order.settlementStatus === 'PENDING') {
                    totalDueToPasr += Math.abs(earningsForShop);
                }
            }
        });

        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                shop,
                displayItems: filteredMergedItems,
                activeOrderCount,
                totalPendingPayout,
                totalRequestedPayout,
                totalDueToPasr,
                SHOP_CATEGORIES
            });
        }

        res.render("pages/shopDetail.ejs", {
            shop,
            displayItems: filteredMergedItems,
            activeOrderCount,
            totalPendingPayout,
            totalRequestedPayout,
            totalDueToPasr,
            SHOP_CATEGORIES
        });
    } else {
        // Customer View: Only items with quantity > 0 AND having an image
        const sellableItems = (shop.items || [])
            .map(item => item.toObject ? item.toObject() : item)
            .filter(item => {
                const hasImg = (item.img && item.img.url) || (item.product && item.product.img && item.product.img.url);
                return item.quantity > 0 && !!hasImg;
            })
            .sort((a, b) => a.price - b.price);

        // Calculate available categories for the filter bar
        const availableCategories = [...new Set(sellableItems.map(item => {
            if (item.product && item.product.category) return item.product.category;
            return item.itemCategory || "Others";
        }))];

        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                shop,
                displayItems: sellableItems,
                availableCategories,
                activeOrderCount: 0,
                totalPendingPayout: 0,
                totalRequestedPayout: 0,
                totalDueToPasr: 0,
                SHOP_CATEGORIES
            });
        }

        res.render("pages/shopDetail.ejs", {
            shop,
            displayItems: sellableItems,
            availableCategories,
            activeOrderCount: 0, // Customers don't see active orders
            totalPendingPayout: 0,
            totalRequestedPayout: 0,
            totalDueToPasr: 0,
            SHOP_CATEGORIES
        });
    }
}));

// Create Review Route
router.post("/shops/:id/reviews", isLogedin, isNotBlocked, validatereview, wrapAsync(async (req, res) => {

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

// Show Transaction History Page
router.get("/shops/:id/transactions", isLogedin, isShopOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const shop = await Shop.findById(id);

    if (!shop) {
        req.flash("error", "Shop not found");
        return res.redirect("/shops");
    }

    const transactions = await TransactionHistory.find({ shopId: shop._id })
        .sort({ createdAt: -1 })
        .lean();

    res.render("pages/shopTransactions.ejs", {
        shop,
        transactions
    });
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
    const { shopName, shopDescription, category, location, openingTime, closingTime, upiId, gstNumber } = req.body.shop;

    // Geocode the new location
    const geoData = await forwardGeocode(location);

    const geometry = geoData.body.features[0].geometry;

    await Shop.findByIdAndUpdate(id, { shopName, shopDescription, category, location, geometry, openingTime, closingTime, upiId, gstNumber });

    req.flash("success", "Shop updated successfully");
    res.redirect(`/shops/${id}`);
}));

// Toggle Shop Status (Active / Holiday)
router.patch("/shops/:id/status", isLogedin, isShopOwner, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { isActive, isHoliday } = req.body;
    const update = {};
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (typeof isHoliday === 'boolean') update.isHoliday = isHoliday;
    const shop = await Shop.findByIdAndUpdate(id, update, { new: true });
    res.json({ success: true, isActive: shop.isActive, isHoliday: shop.isHoliday });
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


// Safe Upload Wrapper for Items
const handleItemUpload = (req, res, next) => {
    const uploadSingle = itemUpload.single("itemImage");
    uploadSingle(req, res, function (err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                req.flash("error", "The uploaded file is too large. Please keep it under 200KB.");
                return res.redirect("back");
            }
            return next(err);
        }
        next();
    });
};

// Create Item
router.post("/shops/:id/items", isLogedin, isNotBlocked, isShopOwner, handleItemUpload, validateItem, wrapAsync(async (req, res) => {

    const { id } = req.params;
    const shop = await Shop.findById(id);
    if (!shop) {
        req.flash("error", "Shop not found");
        return res.redirect("/shops");
    }

    const itemData = req.body.item;
    const { productId } = req.body; // New: product reference from virtual inventory

    // Normalize sizes from checkboxes (may be string, array, or undefined)
    if (itemData.sizes) {
        itemData.sizes = Array.isArray(itemData.sizes) ? itemData.sizes : [itemData.sizes];
    } else {
        itemData.sizes = [];
    }

    const newItem = new Item(itemData);

    if (productId) {
        newItem.product = productId;
    }

    // SHARED IMAGE REUSE LOGIC
    if (req.body.imageId) {
        // Reuse existing image from registry
        const registryEntry = await ItemImageRegistry.findOne({ publicId: req.body.imageId });
        if (registryEntry) {
            newItem.img = {
                url: registryEntry.imageUrl,
                filename: registryEntry.publicId
            };
            registryEntry.usageCount += 1;
            await registryEntry.save();
        }
    } else if (req.file) {
        // New image upload - add to registry
        newItem.img = { url: req.file.path, filename: req.file.filename };

        const canonical = normalizeItemName(itemData.name);
        await ItemImageRegistry.create({
            canonicalName: canonical,
            displayName: itemData.name,
            description: itemData.description || "",
            imageUrl: req.file.path,
            publicId: req.file.filename,
            itemCategory: shop.category,
            usageCount: 1,
            locked: true
        });
    }

    newItem.shop = shop._id;
    shop.items.push(newItem);

    await newItem.save();
    await shop.save();

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.json({ success: true, message: "Item activated/added successfully", item: newItem });
    }

    req.flash("success", "Item activated/added successfully");
    res.redirect(`/shops/${id}`);
}));

// Update Item
router.put("/shops/:id/items/:itemId", isLogedin, isShopOwner, handleItemUpload, wrapAsync(async (req, res) => {

    const { id, itemId } = req.params;
    const { name, price, quantity, itemCategory, description, discount } = req.body.item;
    let sizes = req.body.item.sizes || [];
    if (!Array.isArray(sizes)) sizes = [sizes];

    const updateData = {
        name,
        price,
        quantity,
        itemCategory,
        description,
        sizes,
        discount
    };

    const item = await Item.findById(itemId);
    const oldFilename = item.img ? item.img.filename : null;

    if (req.body.imageId) {
        // Switch to an existing registry image
        const registryEntry = await ItemImageRegistry.findOne({ publicId: req.body.imageId });
        if (registryEntry) {
            updateData.img = {
                url: registryEntry.imageUrl,
                filename: registryEntry.publicId
            };
            registryEntry.usageCount += 1;
            await registryEntry.save();

            // Handle cleanup of old image reference
            if (oldFilename) {
                const oldRegistry = await ItemImageRegistry.findOne({ publicId: oldFilename });
                if (oldRegistry) {
                    oldRegistry.usageCount = Math.max(0, oldRegistry.usageCount - 1);
                    await oldRegistry.save();
                }
            }
        }
    } else if (req.file) {
        // New image upload
        if (oldFilename) {
            const oldRegistry = await ItemImageRegistry.findOne({ publicId: oldFilename });
            if (oldRegistry) {
                oldRegistry.usageCount = Math.max(0, oldRegistry.usageCount - 1);
                await oldRegistry.save();
                // We DO NOT delete from Cloudinary here as per registry rules (Admin only deletion)
            } else {
                // Not in registry, safe to delete (legacy/cleanup)
                await cloudinary.uploader.destroy(oldFilename);
            }
        }
        updateData.img = { url: req.file.path, filename: req.file.filename };

        // Add new image to registry
        const canonical = normalizeItemName(name);
        await ItemImageRegistry.create({
            canonicalName: canonical,
            displayName: name,
            description: description || "",
            imageUrl: req.file.path,
            publicId: req.file.filename,
            itemCategory: shop.category,
            usageCount: 1,
            locked: true
        });
    }

    await Item.findByIdAndUpdate(itemId, updateData);

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.json({ success: true, message: "Item updated successfully" });
    }

    req.flash("success", "Item updated successfully");
    res.redirect(`/shops/${id}`);
}));

// Delete Item
router.delete("/shops/:id/items/:itemId", isLogedin, isShopOwner, wrapAsync(async (req, res) => {

    const { id, itemId } = req.params;
    const item = await Item.findById(itemId);

    if (item.img && item.img.filename) {
        const registryEntry = await ItemImageRegistry.findOne({ publicId: item.img.filename });
        if (registryEntry) {
            registryEntry.usageCount = Math.max(0, registryEntry.usageCount - 1);
            await registryEntry.save();
            // DO NOT delete from Cloudinary (Shared image registry policy)
        } else {
            // Not in registry (legacy), delete as before
            await cloudinary.uploader.destroy(item.img.filename);
        }
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

// Individual Item Details Page
router.get("/items/:id", wrapAsync(async (req, res) => {
    const { id } = req.params;
    const item = await Item.findById(id)
        .populate("shop")
        .populate("product")
        .populate({
            path: "reviews",
            populate: { path: "author" }
        });
    
    if (!item) {
        req.flash("danger", "Item not found");
        return res.redirect("/home");
    }
    
    // Check if shop is verified
    if (!item.shop || !item.shop.verified) {
        if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.status(400).json({ success: false, message: "This shop is not available currently." });
        }
        req.flash("danger", "This shop is not available currently.");
        return res.redirect("/home");
    }

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.json({ success: true, item, shop: item.shop, isOwner: (req.user && item.shop.owner.equals(req.user._id)) });
    }

    res.render("pages/itemDetail.ejs", { item, shop: item.shop, isOwner: (req.user && item.shop.owner.equals(req.user._id)) });
}));

// Add Extra Images for Item
router.post("/items/:id/extra-images", isLogedin, isNotBlocked, itemUpload.array('extraImages', 5), wrapAsync(async (req, res) => {
    const { id } = req.params;
    const item = await Item.findById(id).populate('shop');
    
    if (!item) {
        req.flash("danger", "Item not found");
        return res.redirect("/home");
    }
    
    if (!item.shop.owner.equals(req.user._id)) {
        req.flash("danger", "You are not authorized to edit this item.");
        return res.redirect(`/items/${id}`);
    }
    
    if (req.files && req.files.length > 0) {
        const images = req.files.map(f => ({ url: f.path, filename: f.filename }));
        item.extraImages.push(...images);
        await item.save();
        req.flash("success", "Extra images added successfully");
    } else {
        req.flash("danger", "No images selected");
    }
    
    res.redirect(`/items/${id}`);
}));

// Create Item Review
router.post("/items/:id/reviews", isLogedin, isNotBlocked, validatereview, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let item = await Item.findById(id);
    if (!item) {
        req.flash("danger", "Item not found");
        return res.redirect("/home");
    }
    
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    item.reviews.push(newReview);
    
    await newReview.save();
    await item.save();
    
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(201).json({ success: true, message: "Review added successfully", review: newReview });
    }

    req.flash("success", "Review added successfully");
    res.redirect(`/items/${id}`);
}));

// Delete Item Review
const isItemReviewAuthor = async (req, res, next) => {
    try {
        let { id, reviewId } = req.params;
        let review = await Review.findById(reviewId);
        if (!review) {
            req.flash("danger", "Review not found");
            return res.redirect(`/items/${id}`);
        }
        if (res.locals.currUser && !review.author.equals(res.locals.currUser._id)) {
            req.flash("danger", "You are not the author of this review.");
            return res.redirect(`/items/${id}`);
        }
        next();
    } catch (e) {
        next(e);
    }
};

router.delete("/items/:id/reviews/:reviewId", isLogedin, isItemReviewAuthor, wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Item.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review deleted");
    res.redirect(`/items/${id}`);
}));

// AI Catalog Credit Routes (API)
router.get("/api/shops/:id/ai-credits", wrapAsync(async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: "Shop not found" });

        // Initialize for existing shops that don't have the field yet
        if (shop.aiCatalogCredits === undefined) {
            shop.aiCatalogCredits = 5;
            shop.lastAiCreditRefillDate = new Date();
            await shop.save();
        }

        // Auto-refill logic: 5 free credits every month
        const now = new Date();
        const lastRefill = shop.lastAiCreditRefillDate || shop.createdAt;
        
        if (now.getMonth() !== lastRefill.getMonth() || now.getFullYear() !== lastRefill.getFullYear()) {
            shop.aiCatalogCredits = (shop.aiCatalogCredits || 0) + 5;
            shop.lastAiCreditRefillDate = now;
            await shop.save();
        }

        return res.json({ credits: shop.aiCatalogCredits });
    } catch (e) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));

router.post("/api/shops/:id/ai-credits/consume", wrapAsync(async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: "Shop not found" });
        
        if (shop.aiCatalogCredits <= 0) {
            return res.status(403).json({ error: "Insufficient AI credits" });
        }
        
        shop.aiCatalogCredits -= 1;
        shop.totalAiCatalogsGenerated = (shop.totalAiCatalogsGenerated || 0) + 1;
        await shop.save();
        
        return res.json({ success: true, creditsRemaining: shop.aiCatalogCredits });
    } catch (e) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));

router.post("/api/shops/:id/ai-credits/add", wrapAsync(async (req, res) => {
    try {
        const { amount } = req.body;
        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ error: "Shop not found" });
        
        shop.aiCatalogCredits = (shop.aiCatalogCredits || 0) + (amount || 100);
        await shop.save();
        
        return res.json({ success: true, creditsRemaining: shop.aiCatalogCredits });
    } catch (e) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));

module.exports = router;

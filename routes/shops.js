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
router.get("/shops", wrapAsync(async (req, res) => {
    let { lat, lng, range } = req.query;
    let shops = [];
    range = parseInt(range) || 5;
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
        console.log(`\n========== SHOP DISTANCE QUERY DEBUG ==========`);
        console.log(`User Location: Lat=${lat}, Lng=${lng}`);
        console.log(`Search Range: ${range}km (${range * 1000}m)`);

        let query = {
            geometry: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: range * 1000 // Convert km to meters
                }
            },
            verified: true // Only show verified shops
        };

        // Filter by category if specified
        if (req.query.category && req.query.category !== 'All Shops') {
            query.category = req.query.category;
            console.log(`Category Filter: ${req.query.category}`);
        }

        // Filter by opening hours if "Open Now" is checked
        if (req.query.openNow === 'true') {
            const now = new Date();
            const options = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' };
            const currentTime = now.toLocaleTimeString('en-US', options);
            query.openingTime = { $lte: currentTime };
            query.closingTime = { $gte: currentTime };
            console.log(`Open Now Filter: Current time = ${currentTime}`);
        }

        console.log(`Query:`, JSON.stringify(query, null, 2));

        // Check total verified shops first
        const totalVerifiedShops = await Shop.countDocuments({ verified: true });
        console.log(`Total Verified Shops in DB: ${totalVerifiedShops}`);

        // Check if any shops have geometry
        const shopsWithGeometry = await Shop.countDocuments({
            verified: true,
            'geometry.coordinates': { $exists: true, $ne: [] }
        });
        console.log(`Verified Shops with Geometry: ${shopsWithGeometry}`);

        shops = await Shop.find(query).populate('owner');

        // Prioritize owned shop to the top
        if (req.user) {
            shops.sort((a, b) => {
                const aIsOwner = a.owner._id.equals(req.user._id);
                const bIsOwner = b.owner._id.equals(req.user._id);
                if (aIsOwner && !bIsOwner) return -1;
                if (!aIsOwner && bIsOwner) return 1;
                return 0;
            });

            // For owned shops, check if they have pending orders
            const pendingOrderShops = await Order.find({
                shopId: { $in: shops.filter(s => s.owner._id.equals(req.user._id)).map(s => s._id) },
                orderStatus: 'CREATED'
            }).distinct('shopId');

            const pendingShopIds = pendingOrderShops.map(id => id.toString());

            shops = shops.map(shop => {
                const shopObj = shop.toObject();
                if (req.user && shop.owner._id.equals(req.user._id)) {
                    shopObj.hasPendingOrders = pendingShopIds.includes(shop._id.toString());
                } else {
                    shopObj.hasPendingOrders = false;
                }
                return shopObj;
            });
        }

        console.log(`Found ${shops.length} shops within ${range}km of (${lat}, ${lng})`);
        console.log(`==============================================\n`);
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

    // Check if shop is closed and user is not owner
    const isOwner = req.user && shop.owner._id.equals(req.user._id);

    if (!isOwner && shop.openingTime && shop.closingTime) {
        var istOffsetMs = 5.5 * 60 * 60 * 1000;
        var nowIST = new Date(new Date().getTime() + istOffsetMs);
        var istH = nowIST.getUTCHours();
        var istM = nowIST.getUTCMinutes();
        var nowStr = (istH < 10 ? '0' : '') + istH + ':' + (istM < 10 ? '0' : '') + istM;

        if (!(nowStr >= shop.openingTime && nowStr <= shop.closingTime)) {
            // Format time for flash message
            const [h, m] = shop.openingTime.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            const displayTime = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;

            req.flash("error", `This shop is currently closed. It will open at ${displayTime}.`);
            return res.redirect("/shops");
        }
    }

    if (isOwner) {
        // Owner View: Show all MasterProducts for this category + Local Items
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
            masterQuery.category = shop.category;
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

        // [STRICT IMAGE FILTER] Only show items with images
        const filteredMergedItems = mergedItems
            .filter(item => {
                const hasImg = (item.img && item.img.url) || (item.product && item.product.img && item.product.img.url);
                return !!hasImg;
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
            settlementStatus: 'PENDING'
        });

        let totalPendingPayout = 0; // PASR owes Shop
        let totalDueToPasr = 0;     // Shop owes PASR

        unsettledOrders.forEach(order => {
            if (order.selfDelivery) {
                if (order.paymentType === 'PREPAID') {
                    // PASR collected everything online; Shop did the delivery
                    totalPendingPayout += (order.subtotalAmount + order.deliveryCharge - (order.pasrCommission || 0));
                } else if (order.paymentType === 'COD') {
                    // Shop collected cash; PASR takes commission
                    totalDueToPasr += (order.pasrCommission || 0);
                }
            } else {
                // Partner Delivered (both PREPAID and COD means PASR gets/handles the money)
                totalPendingPayout += order.subtotalAmount;
            }
        });

        res.render("pages/shopDetail.ejs", { shop, displayItems: filteredMergedItems, activeOrderCount, totalPendingPayout, totalDueToPasr });
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

        res.render("pages/shopDetail.ejs", {
            shop,
            displayItems: sellableItems,
            availableCategories,
            activeOrderCount: 0, // Customers don't see active orders
            totalPendingPayout: 0,
            totalDueToPasr: 0
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
    const { shopName, shopDescription, category, location, openingTime, closingTime, upiId } = req.body.shop;

    // Geocode the new location
    const geoData = await forwardGeocode(location);

    const geometry = geoData.body.features[0].geometry;

    await Shop.findByIdAndUpdate(id, { shopName, shopDescription, category, location, geometry, openingTime, closingTime, upiId });

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


// Create Item
router.post("/shops/:id/items", isLogedin, isNotBlocked, isShopOwner, itemUpload.single("itemImage"), validateItem, wrapAsync(async (req, res) => {

    console.log("Create Item Route Hit");
    console.log("Body:", req.body);
    console.log("Item Category:", req.body.item.itemCategory);
    console.log("File:", req.file);

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

    req.flash("success", "Item activated/added successfully");
    res.redirect(`/shops/${id}`);
}));

// Update Item
router.put("/shops/:id/items/:itemId", isLogedin, isShopOwner, itemUpload.single("itemImage"), wrapAsync(async (req, res) => {

    const { id, itemId } = req.params;
    const { name, price, quantity, itemCategory, description } = req.body.item;
    let sizes = req.body.item.sizes || [];
    if (!Array.isArray(sizes)) sizes = [sizes];

    const updateData = {
        name,
        price,
        quantity,
        itemCategory,
        description,
        sizes
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

module.exports = router;

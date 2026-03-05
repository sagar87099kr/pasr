const express = require("express");
const router = express.Router();
const Product = require("../data/product.js");
const Order = require("../data/order.js");
const { isLogedin, isVerifiedCustomer, isOwner, isadmin, isProductOwner } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { forwardGeocode } = require("../utils/geocoder");
const { storage, cloudinary, upload, itemUpload } = require("../cloud_con.js");


router.get("/localMarket", wrapAsync(async (req, res) => {
    let { lat, lng, range } = req.query;
    let products = [];
    range = parseInt(range) || 10;
    // Cap range at 10km maximum
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

        if (req.query.category && req.query.category !== 'All Items') {
            query.categories = req.query.category;
        }

        products = await Product.find(query).populate('owner');

        if (req.user) {
            // Prioritize the logged-in user's own products to the top
            products.sort((a, b) => {
                const aIsOwner = a.owner._id.equals(req.user._id);
                const bIsOwner = b.owner._id.equals(req.user._id);
                if (aIsOwner && !bIsOwner) return -1;
                if (!aIsOwner && bIsOwner) return 1;
                return 0;
            });

            const hasPendingOrders = await Order.exists({
                shopId: req.user._id,
                orderStatus: 'CREATED'
            });

            products = products
                .filter(product => {
                    // Only show verified products publicly.
                    // The owner can see their own unverified (pending) listings.
                    const isOwner = product.owner._id.equals(req.user._id);
                    return product.verified || isOwner;
                })
                .map(product => {
                    const prodObj = product.toObject();
                    const isOwner = product.owner._id.equals(req.user._id);
                    // Flag for the template to render a "Pending Verification" badge
                    prodObj.isPendingVerification = !product.verified && isOwner;
                    prodObj.hasPendingOrders = isOwner ? !!hasPendingOrders : false;
                    return prodObj;
                });
        } else {
            // Guest users: only see verified products
            products = products
                .filter(product => product.verified)
                .map(product => {
                    const prodObj = product.toObject();
                    prodObj.isPendingVerification = false;
                    prodObj.hasPendingOrders = false;
                    return prodObj;
                });
        }

        console.log(`Found ${products.length} products within ${range}km of (${lat}, ${lng})`);
    }


    res.render("pages/localMarket.ejs", { products, lat, lng, range });
}));

router.get("/product/seller", isLogedin, isVerifiedCustomer, wrapAsync(async (req, res) => {
    res.render("pages/productSeller.ejs");
}));

router.post("/product/seller", isLogedin, itemUpload.fields([
    { name: 'productImage', maxCount: 5 }
]), wrapAsync(async (req, res) => {
    const productData = req.body.product;
    const geoData = await forwardGeocode(productData.location);

    const product = new Product(productData);
    product.geometry = geoData.body.features[0].geometry;
    product.owner = req.user._id;

    if (req.files['productImage']) {
        product.productImage = req.files['productImage'].map(f => ({ url: f.path, filename: f.filename }));
    }

    await product.save();
    req.flash("success", "Product created successfully");
    res.redirect("/home");
}));

// Verification Routes (Admin Only)
router.put("/:id/verifyproduct", isLogedin, isadmin, wrapAsync(async (req, res) => {

    let { id } = req.params;
    let product = await Product.findByIdAndUpdate(id, { ...req.body.product });
    req.flash("success", "Product Verified");
    res.redirect("/product/verify");
}));

router.delete("/:id/verifyfailproduct", isLogedin, isadmin, wrapAsync(async (req, res) => {

    let { id } = req.params;
    let product = await Product.findById(id);

    if (product && product.productImage) {
        for (let img of product.productImage) {
            await cloudinary.uploader.destroy(img.filename);
        }
    }

    await Product.findByIdAndDelete(id);
    req.flash("error", "Product Deleted");
    res.redirect("/product/verify");
}));

// Public Seller Profile Page
router.get("/seller/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;

    // Fetch the seller (customer) details
    const Customer = require("../data/customers.js");
    const seller = await Customer.findById(id);

    if (!seller) {
        req.flash("error", "Seller not found");
        return res.redirect("/localMarket");
    }

    // Fetch all products owned by this seller
    let products = await Product.find({ owner: id }).populate("owner");

    // Filter logic: Only show verified products publicly, unless the logged-in user is the owner
    const isOwnerViewing = req.user && seller._id.equals(req.user._id);

    products = products.filter(p => p.verified || isOwnerViewing).map(p => {
        const prodObj = p.toObject();
        prodObj.isPendingVerification = !p.verified && isOwnerViewing;
        prodObj.hasPendingOrders = false; // Simplified for profile view
        return prodObj;
    });

    res.render("pages/sellerProfile.ejs", { seller, products });
}));

// Product Detail Page
router.get("/products/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const product = await Product.findById(id).populate("owner");

    if (!product) {
        req.flash("error", "Product not found");
        return res.redirect("/localMarket");
    }

    res.render("pages/productDetail.ejs", { product });
}));

// Update Product
router.put("/products/:id/edit", isLogedin, isProductOwner, itemUpload.fields([{ name: 'productImage', maxCount: 1 }]), wrapAsync(async (req, res) => {

    let { id } = req.params;
    const { productName, productDescription, price, quantity, categories, upiId } = req.body.product;
    const updateData = { productName, productDescription, price, quantity, categories, upiId };

    if (req.files && req.files.productImage && req.files.productImage[0]) {
        const product = await Product.findById(id);
        if (product.productImage && product.productImage.length > 0) {
            for (let img of product.productImage) {
                await cloudinary.uploader.destroy(img.filename);
            }
        }
        updateData.productImage = [{ url: req.files.productImage[0].path, filename: req.files.productImage[0].filename }];
    }

    await Product.findByIdAndUpdate(id, updateData);

    req.flash("success", "Product updated successfully");
    res.redirect(`/products/${id}`);
}));

// Delete Product
router.delete("/products/:id/delete", isLogedin, isProductOwner, wrapAsync(async (req, res) => {

    let { id } = req.params;
    const product = await Product.findById(id);

    if (product.productImage) {
        for (let img of product.productImage) {
            await cloudinary.uploader.destroy(img.filename);
        }
    }

    await Product.findByIdAndDelete(id);
    req.flash("success", "Product and images deleted successfully");
    res.redirect("/localMarket");
}));

module.exports = router;

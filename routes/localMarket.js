const express = require("express");
const router = express.Router();
const Product = require("../data/product.js");
const { isLogedin, isVerifiedCustomer, isOwner, isadmin, isProductOwner } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const multer = require("multer");
const { storage, cloudinary } = require("../cloud_con.js");
const upload = multer({ storage });

router.get("/localMarket", isLogedin, wrapAsync(async (req, res) => {
    let { lat, lng, range } = req.query;
    let products = [];
    range = parseInt(range) || 10;
    // Cap range at 10km maximum
    if (range > 10) range = 10;


    // Use user's saved location if query params are missing and user is logged in
    if ((!lat || !lng) && req.user && req.user.geometry && req.user.geometry.coordinates) {
        lng = req.user.geometry.coordinates[0];
        lat = req.user.geometry.coordinates[1];
    }

    if (lat && lng) {
        let query = {
            verified: true, // Only show verified products
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

        if (req.query.category && req.query.category !== 'All Items') {
            query.categories = req.query.category;
        }

        products = await Product.find(query).populate('owner');
    }


    res.render("pages/localMarket.ejs", { products, lat, lng, range });
}));

router.get("/product/seller", isLogedin, wrapAsync(async (req, res) => {
    res.render("pages/productSeller.ejs");
}));

router.post("/product/seller", isLogedin, upload.array("productImage"), wrapAsync(async (req, res) => {
    const productData = req.body.product;
    const geoData = await geocodingClient.forwardGeocode({
        query: productData.location,
        limit: 1,
    }).send();

    const product = new Product(productData);
    product.geometry = geoData.body.features[0].geometry;
    product.owner = req.user._id;

    if (req.files) {
        product.productImage = req.files.map(f => ({ url: f.path, filename: f.filename }));
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

// Product Detail Page
router.get("/products/:id", isLogedin, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const product = await Product.findById(id).populate("owner");

    if (!product) {
        req.flash("error", "Product not found");
        return res.redirect("/localMarket");
    }

    res.render("pages/productDetail.ejs", { product });
}));

// Update Product
router.put("/products/:id/edit", isLogedin, isProductOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const { productName, productDescription, price, quantity, categories } = req.body.product;
    await Product.findByIdAndUpdate(id, { productName, productDescription, price, quantity, categories });

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

const express = require("express");
const router = express.Router();
const { forwardGeocode, reverseGeocode } = require("../utils/geocoder");
const Product = require("../data/product.js");
const Customer = require("../data/customers.js");
const Shop = require("../data/shops.js");
const Provider = require("../data/serviceproviders.js");
const { isLogedin, isadmin } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const itemController = require("../controllers/item.js");


// help route
router.get("/help", (req, res) => {
    res.render("pages/help.ejs");
});
router.get("/privacy", (req, res) => {
    res.render("pages/privacy.ejs")
})

// terms and condition route  
router.get("/T&C", (req, res) => {
    res.render("pages/T&C.ejs");
});

// Delete account route (required by Google Play) - Public Form
router.get("/delete-account", (req, res) => {
    res.send(`
        <html>
        <head><title>Delete Account - PaSr</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 2rem;">
            <h2>Account Deletion Request</h2>
            <p>Enter your WhatsApp number and password to permanently delete your PaSr account and all associated data.</p>
            <form action="/delete-account" method="POST" style="display: flex; flex-direction: column; gap: 1rem;">
                <input type="text" name="username" placeholder="WhatsApp Number (e.g. 9999999999)" required style="padding: 10px; font-size: 16px;">
                <input type="password" name="password" placeholder="Password" required style="padding: 10px; font-size: 16px;">
                <button type="submit" style="padding: 12px; background-color: #dc3545; color: white; border: none; font-size: 16px; cursor: pointer;">Delete My Account Permanently</button>
            </form>
        </body>
        </html>
    `);
});

router.post("/delete-account", wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    
    // Authenticate user first
    const isAuthenticated = await new Promise((resolve) => {
        Customer.authenticate()(String(username), password, (err, userResult, msg) => {
            resolve(userResult);
        });
    });

    if (!isAuthenticated) {
        return res.send("<h3 style='color:red;'>Authentication failed. Incorrect phone number or password. <a href='/delete-account'>Try again</a></h3>");
    }

    const userId = isAuthenticated._id;
    const cloudinary = require("../cloud_con.js");
    const deletePromises = [];

    try {
        // 1. Providers
        const providers = await Provider.find({ owner: userId });
        for (let p of providers) {
            if (p.personImage?.length) {
                for (let img of p.personImage) {
                    if (img.filename) deletePromises.push(cloudinary.uploader.destroy(img.filename).catch(e => {}));
                }
            }
            if (p.review?.length) await require("../data/review.js").deleteMany({ _id: { $in: p.review } });
            await Provider.findByIdAndDelete(p._id);
        }

        // 2. Shops
        const shops = await Shop.find({ owner: userId });
        for (let s of shops) {
            if (s.shopImage?.length) {
                for (let img of s.shopImage) {
                    if (img.filename) deletePromises.push(cloudinary.uploader.destroy(img.filename).catch(e => {}));
                }
            }
            if (s.items?.length) {
                for (let item of s.items) {
                    if (item.itemImage?.filename) deletePromises.push(cloudinary.uploader.destroy(item.itemImage.filename).catch(e => {}));
                }
            }
            if (s.reviews?.length) await require("../data/review.js").deleteMany({ _id: { $in: s.reviews } });
            await Shop.findByIdAndDelete(s._id);
        }

        // 3. Products
        const products = await Product.find({ owner: userId });
        for (let prod of products) {
            if (prod.productImage?.length) {
                for (let img of prod.productImage) {
                    if (img.filename) deletePromises.push(cloudinary.uploader.destroy(img.filename).catch(e => {}));
                }
            }
            await Product.findByIdAndDelete(prod._id);
        }

        // 4. Kisan Sabha
        const posts = await require("../data/keshanSabhaPost.js").find({ author: userId });
        for (let post of posts) {
            if (post.media?.length) {
                for (let m of post.media) {
                    if (m.filename) deletePromises.push(cloudinary.uploader.destroy(m.filename).catch(e => {}));
                }
            }
            await require("../data/keshanSabhaPost.js").findByIdAndDelete(post._id);
        }
        await require("../data/keshanSabhaComment.js").deleteMany({ author: userId });
        await require("../data/keshanSabhaReport.js").deleteMany({ author: userId });

        // 5. Associations
        await require("../data/deliveryPartner.js").deleteMany({ user: userId });
        await require("../data/notification.js").deleteMany({ recipient: userId });
        await require("../data/review.js").deleteMany({ author: userId });

        // 6. Delete User
        await Customer.findByIdAndDelete(userId);

        if (deletePromises.length > 0) {
            Promise.all(deletePromises).catch(e => {});
        }

        res.send("<h3 style='color:green;'>Your account and all associated data have been permanently deleted.</h3>");

    } catch (error) {
        res.send("<h3 style='color:red;'>An error occurred during deletion. Please contact support.</h3>");
    }
}));

// Redirect old /home to the new personalized React-based homepage at /
router.get("/home", (req, res) => {
    res.redirect("/");
});

// Route to set user location from browser
router.post("/set-location", async (req, res) => {

    const { latitude, longitude } = req.body;
    if (latitude && longitude) {
        req.session.location = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
        // Location update log removed

        if (req.user) {
            try {
                const response = await reverseGeocode([parseFloat(longitude), parseFloat(latitude)]);

                if (response.body.features.length > 0) {
                    const feature = response.body.features[0];
                    const address = feature.place_name;
                    let pincode = null;

                    // Extract pincode from context
                    if (feature.context) {
                        const pincodeCtx = feature.context.find(c => c && c.id && (c.id.startsWith('postcode') || c.id === 'postal_code'));
                        if (pincodeCtx) pincode = parseInt(pincodeCtx.text);
                    }

                    await Customer.findByIdAndUpdate(req.user._id, {
                        geometry: req.session.location,
                        address: address,
                        pincode: pincode
                    });
                    // User persisted log removed
                }
            } catch (e) {
                console.error("Failed to persist location to DB:", e);
            }
        }

        res.status(200).json({ message: "Location saved" });
    } else {
        res.status(400).json({ message: "Invalid coordinates" });
    }
});

// Route to get address from coordinates (Reverse Geocoding)
router.get("/get-address", async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
    }
    try {
        const response = await reverseGeocode([parseFloat(lon), parseFloat(lat)]);

        if (response.body.features.length > 0) {
            const address = response.body.features[0].place_name;
            res.json({ address });
        } else {
            res.json({ address: "Location found but no address details available." });
        }
    } catch (e) {
        console.error("Reverse geocoding error:", e);
        res.status(500).json({ error: "Failed to fetch address" });
    }
});

// Route to get coordinates from location name (Forward Geocoding - Manual Entry Fallback)
router.get("/geocode-location", async (req, res) => {
    const { location } = req.query;
    if (!location) {
        return res.status(400).json({ error: "Missing location parameter" });
    }
    try {
        const response = await forwardGeocode(location);

        if (response.body.features.length > 0) {
            const feature = response.body.features[0];
            const [lng, lat] = feature.geometry.coordinates;
            const placeName = feature.place_name;

            // Save to session
            req.session.location = {
                type: 'Point',
                coordinates: [lng, lat]
            };

            res.json({
                success: true,
                lat,
                lng,
                placeName
            });
        } else {
            res.status(404).json({ error: "Location not found. Please try a different search." });
        }
    } catch (e) {
        console.error("Forward geocoding error:", e);
        res.status(500).json({ error: "Failed to geocode location" });
    }
});

// Product Verification Route (Admin Only)
router.get("/product/verify", isLogedin, isadmin, wrapAsync(async (req, res) => {
    let products = await Product.find().populate("owner");
    res.render("pages/productVerification.ejs", { products });
}));

// Protected Action Routes
router.get("/action/call/:number", isLogedin, (req, res) => {
    const { number } = req.params;
    res.redirect(`tel:+91${number}`);
});

router.get("/action/whatsapp/:number", isLogedin, (req, res) => {
    const { number } = req.params;
    const { text } = req.query;
    let redirectUrl = `https://wa.me/91${number}`;
    if (text) {
        redirectUrl += `?text=${encodeURIComponent(text)}`;
    }
    res.redirect(redirectUrl);
});

// The new personalized React-based homepage
router.get("/", (req, res) => {
    res.render("pages/reactHome.ejs", {
        containerClass: 'react-home-container',
        useMaps: false,
        useProfileCss: false,
        useInsideCateCss: false,
        seo: {
            title: "PASR - Perfectly Assured Service and Rentals",
            description: "Find local DJs, Catering, Vehicles, and Decoration services within your neighborhood. Perfectly Assured Service and Rentals for rural and semi-urban India.",
            keywords: "pasr, pasr.in, local services, dj, catering, tent, decoration, vehicle rentals, rural bazaar",
            url: "https://www.pasr.in/"
        }
    });
});

// React Service Page
router.get("/service", (req, res) => {
    res.render("pages/reactService.ejs", {
        containerClass: 'react-home-container',
        useMaps: false,
        useProfileCss: false,
        useInsideCateCss: false,
        seo: {
            title: "Local Services - PASR",
            description: "Find local Farming & Agriculture, Vehicles, Catering, DJs, and Event Decoration services within your neighborhood.",
            keywords: "pasr, pasr.in, local services, dj, catering, tent, decoration, vehicle rentals",
            url: "https://www.pasr.in/service"
        }
    });
});

// The existing home route renamed to categories for fallback/navigation
router.get("/categories", (req, res) => {
    res.render("pages/home.ejs", {
        useMaps: false,
        useProfileCss: false,
        useInsideCateCss: false,
        seo: {
            title: "Categories - PASR",
            description: "Browse all local service categories on PASR.",
            url: "https://www.pasr.in/categories"
        }
    });
});

// Dedicated Shop Items (Featured Items) Page
router.get("/shop-items", (req, res) => {
    res.render("pages/shopItems.ejs", {
        containerClass: 'shop-items-container',
        useMaps: false,
        useProfileCss: false,
        useInsideCateCss: false,
        seo: {
            title: "Shop Items - Dedicated Bazaar - PASR",
            description: "Browse all local shop items and featured products in your neighborhood.",
            url: "https://www.pasr.in/shop-items"
        }
    });
});

// JSON API for dynamic discovery on React homepage
router.get("/api/discovery", wrapAsync(async (req, res) => {
    let { lat, lon, range = 5 } = req.query;
    let userLocation = null;
    let maxDist = parseFloat(range) * 1000; // range in meters

    let bazaarId = null;
    if (req.headers['x-bazaar-id']) {
        bazaarId = req.headers['x-bazaar-id'];
    } else if (req.session && req.session.bazaarId) {
        bazaarId = req.session.bazaarId;
    }

    if (bazaarId) {
        const Bazaar = require("../data/bazaar");
        const bazaarData = await Bazaar.findById(bazaarId);
        if (bazaarData && bazaarData.geometry && bazaarData.geometry.coordinates) {
            userLocation = {
                type: 'Point',
                coordinates: bazaarData.geometry.coordinates
            };
            maxDist = bazaarData.radius || 5000;
        }
    } else if (lat && lon) {
        userLocation = {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
        };
    } else if (req.session && req.session.location) {
        userLocation = req.session.location;
    } else if (req.user && req.user.geometry) {
        userLocation = req.user.geometry;
    }

    const queryOptions = (baseQuery, model) => {
        // If it's the Shop or Provider model and we have a bazaarId, filter strictly by bazaar
        if ((model.modelName === 'Shop' || model.modelName === 'Provider') && bazaarId) {
            return {
                ...baseQuery,
                bazaar: bazaarId
            };
        }

        if (userLocation && userLocation.coordinates && userLocation.coordinates.length === 2) {
            return {
                ...baseQuery,
                geometry: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: userLocation.coordinates
                        },
                        $maxDistance: maxDist
                    }
                }
            };
        }
        return baseQuery;
    };

    const fetchWithFallback = async (model, categoryField, categoryValue) => {
        let results = await model.find(queryOptions({ [categoryField]: categoryValue }, model)).populate("owner");
        
        // If no results and we have a location (and not using strict bazaar filtering), try a wider range
        if (results.length === 0 && userLocation && !bazaarId) {
            const widerDist = 20000; 
            results = await model.find({
                [categoryField]: categoryValue,
                geometry: {
                    $near: {
                        $geometry: { type: "Point", coordinates: userLocation.coordinates },
                        $maxDistance: widerDist
                    }
                }
            }).populate("owner");
        }
        
        // Final fallback: just get most recent if still empty. NEVER fallback if bazaarId is set!
        if (results.length === 0 && !bazaarId) {
            results = await model.find({ [categoryField]: categoryValue }).sort({ createdAt: -1 }).populate("owner");
        }
        
        return results;
    };

    const [shops, bazaar, vehicles, farming, catering, dj, threeWheelers, filming, decoration, bandParty, homeService, heavyEquipments] = await Promise.all([
        fetchWithFallback(Shop, "verified", true), // Special case for Shop (all verified)
        fetchWithFallback(Product, "verified", true), // Special case for Product (all verified)
        fetchWithFallback(Provider, "categories", "Four Wheelers"),
        fetchWithFallback(Provider, "categories", "Farming Vehicles"),
        fetchWithFallback(Provider, "categories", "Caterings"),
        fetchWithFallback(Provider, "categories", "DJ and Tent"),
        fetchWithFallback(Provider, "categories", "Three Wheelers"),
        fetchWithFallback(Provider, "categories", "Filming"),
        fetchWithFallback(Provider, "categories", "Decoration"),
        fetchWithFallback(Provider, "categories", "Band Party"),
        fetchWithFallback(Provider, "categories", "Home Service provider"),
        fetchWithFallback(Provider, "categories", "Heavy Equipments")
    ]);

    res.json({
        success: true,
        data: {
            cartItems: (req.session.cart && req.session.cart.items) ? req.session.cart.items : [],
            shops,
            bazaar,
            vehicles,
            farming,
            catering,
            dj,
            threeWheelers,
            filming,
            decoration,
            bandParty,
            homeService,
            heavyEquipments
        }
    });
}));

// Route to fetch items for the homepage
router.get("/api/home/items", itemController.getHomeItems);

module.exports = router;

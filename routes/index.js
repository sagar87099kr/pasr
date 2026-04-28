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

// this is going to be the home route for the customer
router.get("/home", (req, res) => {
    res.render("pages/home.ejs", {
        useMaps: false,
        useProfileCss: false,
        useInsideCateCss: false,
        seo: {
            title: "PASR - Online Local Bazaar & Kisan Sabha",
            description: "Join PASR to connect directly with local farmers, daily shops, and access local home services, all in your neighborhood.",
            keywords: "pasr, pasr.in, pasr market, pasr online, pasr giridih, pasr jharkhand, pasr farmers, pasr digital market, pasr website, pasr app, past in, past.in, p p market, pp market jharkhand, online market giridih, digital market giridih, 24 hours market giridih, farmers website giridih, kisan website jharkhand, online sabzi market giridih, buy vegetables online giridih, sell crops online giridih, giridih online shop, raj dhanwar online market, doranda online market, jharkhand farmers app, local business listing giridih, online dairy products giridih, sell milk online jharkhand, online goat selling giridih, poultry market online jharkhand, kisan news giridih, farmers news jharkhand, online agriculture platform india, district farmers network giridih, giridih business promotion website, digital kranti giridih, kisan digital platform, online mandi giridih, giridih bazar online, raj dhanwar bazar online, doranda bazar online, jharkhand digital bazar, local sellers website giridih, online services giridih, electrician online giridih, plumber online giridih, local mechanic giridih, property listing giridih, house rent giridih online, land sale giridih website, giridih job posting site, giridih advertisement website, free business listing giridih, small business promotion jharkhand, rural ecommerce india, village digital market jharkhand, kisan connect giridih, online fertilizer shop giridih, tractor service giridih, agriculture tools online giridih, farm equipment giridih, pasr news section, pasr farmer community, pasr online mandi, pasr jharkhand market, pasr digital india, pasr local platform, pasr rajdhanwar, pasr doranda, pasr kisan app, pasr business portal, pasr advertisement site, pasr farmers network, pasr online bazar, pasr district market, pasr agriculture news, pasr buy sell platform, pasr marketplace, pasr india, pasr rural market, pasr farmer support, pasr online promotion, pasr india website, pasr farmer group, pasr online service listing, pasr local business site, pasr digital shop, pasr ecommerce jharkhand, pasr giridih district, pasr rural ecommerce, pasr krishi platform, pasr mandi online, pasr digital business, pasr 24 hours market, pasr online store, pasr jharkhand farmers, pasr digital advertisement, pasr kisan news portal, pasr village market, pasr business growth platform, pasr community market",
            image: "https://www.pasr.in/images/icon.jpeg",
            url: "https://www.pasr.in/home"
        }
    });
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
                        const pincodeCtx = feature.context.find(c => c.id.startsWith('postcode') || c.id === 'postal_code');
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

    if (lat && lon) {
        userLocation = {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
        };
    } else if (req.session.location) {
        userLocation = req.session.location;
    } else if (req.user && req.user.geometry) {
        userLocation = req.user.geometry;
    }

    const maxDist = parseFloat(range) * 1000; // range in meters

    const queryOptions = (baseQuery) => {
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
        let results = await model.find(queryOptions({ [categoryField]: categoryValue })).populate("owner");
        
        // If no results and we have a location, try a wider range (up to 20km)
        if (results.length === 0 && userLocation) {
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
        
        // Final fallback: just get most recent if still empty
        if (results.length === 0) {
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

const express = require("express");
const router = express.Router();
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const Product = require("../data/product.js");
const Customer = require("../data/customers.js");
const { isLogedin, isadmin } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");

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
    res.render("pages/home.ejs")
});

// Route to set user location from browser
router.post("/set-location", async (req, res) => {
    const { latitude, longitude } = req.body;
    if (latitude && longitude) {
        req.session.location = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
        console.log("Location updated in session:", req.session.location);

        if (req.user) {
            try {
                const response = await geocodingClient.reverseGeocode({
                    query: [parseFloat(longitude), parseFloat(latitude)],
                    limit: 1
                }).send();

                if (response.body.features.length > 0) {
                    const feature = response.body.features[0];
                    const address = feature.place_name;
                    let pincode = null;

                    // Extract pincode from context
                    if (feature.context) {
                        const pincodeCtx = feature.context.find(c => c.id.startsWith('postcode'));
                        if (pincodeCtx) pincode = parseInt(pincodeCtx.text);
                    }

                    await Customer.findByIdAndUpdate(req.user._id, {
                        geometry: req.session.location,
                        address: address,
                        pincode: pincode
                    });
                    console.log("User persisted to DB:", req.user._id);
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
        const response = await geocodingClient.reverseGeocode({
            query: [parseFloat(lon), parseFloat(lat)],
            limit: 1
        }).send();

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
        const response = await geocodingClient.forwardGeocode({
            query: location,
            limit: 1
        }).send();

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

// Redirect root to home
router.get("/", (req, res) => {
    res.redirect("/home");
});

module.exports = router;

const express = require("express");
const router = express.Router();
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

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
router.post("/set-location", (req, res) => {
    const { latitude, longitude } = req.body;
    if (latitude && longitude) {
        req.session.location = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
        console.log("Location updated in session:", req.session.location);
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

module.exports = router;

const express = require('express');
const router = express.Router();
const Bazaar = require('../data/bazaar');
const ExpressError = require('../utils/expressError');

// GET /api/bazaars - Get all bazaars
router.get('/', async (req, res, next) => {
    try {
        const { lat, lng, q } = req.query;
        let query = { isActive: true };

        if (q) {
            query.name = { $regex: q, $options: 'i' };
        }

        let bazaars;
        
        if (lat && lng) {
            // Sort by nearest if lat/lng are provided
            bazaars = await Bazaar.find({
                ...query,
                geometry: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [parseFloat(lng), parseFloat(lat)]
                        }
                    }
                }
            });
        } else {
            bazaars = await Bazaar.find(query).sort({ name: 1 });
        }

        res.json({ success: true, bazaars });
    } catch (e) {
        next(e);
    }
});

// POST /api/bazaars/select - Set bazaar context in session
router.post('/select', async (req, res, next) => {
    try {
        const { bazaarId } = req.body;
        
        if (!bazaarId) {
            // Clear selected bazaar
            req.session.bazaarId = null;
            req.session.bazaarName = null;
            req.session.bazaarLocation = null;
            return res.json({ success: true, message: "Bazaar selection cleared" });
        }

        const bazaar = await Bazaar.findById(bazaarId);
        if (!bazaar) {
            return res.status(404).json({ success: false, message: "Bazaar not found" });
        }

        req.session.bazaarId = bazaar._id;
        req.session.bazaarName = bazaar.name;
        // Keep the exact geometry array for $near queries
        req.session.bazaarLocation = bazaar.geometry;

        res.json({ 
            success: true, 
            message: `Selected ${bazaar.name}`,
            bazaar: { id: bazaar._id, name: bazaar.name }
        });
    } catch (e) {
        next(e);
    }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const MasterProduct = require("../data/masterProduct");
const wrapAsync = require("../utils/wrapAsync");

/**
 * @route   GET /api/products/search
 * @desc    Search for products in the Master Catalog with prefix-matching
 * @access  Public (for now, or authenticated if needed)
 */
router.get("/search", wrapAsync(async (req, res) => {
    const { q, category } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const searchRegex = new RegExp(`^${q}`, 'i'); // Prefix match
    const anywhereRegex = new RegExp(`${q}`, 'i'); // Fallback anywhere

    const query = {
        isActive: true,
        $or: [
            { name: anywhereRegex },
            { brand: anywhereRegex }
        ]
    };

    if (category) {
        query.category = category;
    }

    // Prioritize prefix matches if possible, or just use regular search
    const results = await MasterProduct.find(query)
        .limit(20)
        .lean();

    res.json(results);
}));

module.exports = router;

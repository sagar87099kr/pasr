const express = require("express");
const router = express.Router();
const ItemImageRegistry = require("../data/itemImageRegistry");
const { normalizeItemName } = require("../utils/normalization");
const wrapAsync = require("../utils/wrapAsync");

// GET /api/item-suggestions?q=itemName
router.get("/item-suggestions", wrapAsync(async (req, res) => {
    let { q } = req.query;
    if (!q || q.trim().length < 2) {
        return res.json([]);
    }

    const canonicalQuery = normalizeItemName(q);
    let query = {
        $or: [
            { canonicalName: new RegExp("^" + canonicalQuery, "i") },
            { displayName: new RegExp(q, "i") }
        ]
    };

    if (req.query.category) {
        if (req.query.category === "Grocery") {
            const grocerySubCats = [
                "Grocery", "Staples & Grains", "Edible Oil & Ghee",
                "Spices & Masala", "Snacks & Namkeen", "Beverages",
                "Dairy & Refrigerator", "Bakery Items", "Personal Care",
                "Home Cleaning & Household", "Baby Care", "Dry Fruits & Sweets",
                "Instant & Ready to Eat"
            ];
            query.itemCategory = { $in: grocerySubCats };
        } else if (req.query.category === "General Store") {
            const generalStoreSubCats = [
                "Daily Essentials", "Snacks & Beverages", "Personal Care",
                "Household Items", "Stationery", "Cleaning Supplies",
                "Baby Care", "Snacks & Namkeen"
            ];
            query.itemCategory = { $in: generalStoreSubCats };
        } else {
            query.itemCategory = req.query.category;
        }
    }

    const suggestions = await ItemImageRegistry.find(query)
        .limit(8)
        .lean();

    // Map to the requested output format
    const result = suggestions.map(s => ({
        imageUrl: s.imageUrl,
        description: s.description,
        imageId: s.publicId, // Using publicId as imageId
        displayName: s.displayName,
        itemCategory: s.itemCategory
    }));

    res.json(result);
}));

module.exports = router;

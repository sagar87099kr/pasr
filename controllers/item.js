const Item = require("../data/item");
const Shop = require("../data/shops");
const MasterProduct = require("../data/masterProduct");
const SHOP_CATEGORIES = require("../data/categories");

module.exports.getHomeItems = async (req, res) => {
    try {
        let { lat, lon, category } = req.query;
        let userLocation = null;

        if (lat && lon) {
            userLocation = {
                type: 'Point',
                coordinates: [parseFloat(lon), parseFloat(lat)]
            };
        } else if (req.session && req.session.location) {
            userLocation = req.session.location;
        } else if (req.user && req.user.geometry) {
            userLocation = req.user.geometry;
        }

        let query = { isActive: true };

        // 1. Get all shop IDs as global fallback (remove verification filter to show all listed content)
        const allShops = await Shop.find().select('_id');
        const allShopIds = allShops.map(s => s._id);

        if (userLocation && userLocation.coordinates && userLocation.coordinates.length === 2) {
            // Find shops within 5 km
            let nearbyShops = await Shop.find({
                geometry: {
                    $near: {
                        $geometry: { type: "Point", coordinates: userLocation.coordinates },
                        $maxDistance: 5000
                    }
                }
            }).select('_id');

            // Fallback 1: If no shops within 5km, try 15km
            if (nearbyShops.length === 0) {
                nearbyShops = await Shop.find({
                    geometry: {
                        $near: {
                            $geometry: { type: "Point", coordinates: userLocation.coordinates },
                            $maxDistance: 15000
                        }
                    }
                }).select('_id');
            }

            const shopIds = nearbyShops.map(s => s._id);
            
            // Fallback 2: If still no shops, show all shops globally instead of showing nothing
            if (shopIds.length > 0) {
                query.shop = { $in: shopIds };
            } else {
                query.shop = { $in: allShopIds };
            }
        } else {
            // If no location, filter by all shops globally
            query.shop = { $in: allShopIds };
        }

        const items = await Item.find(query)
            .populate({
                path: "product",
                select: "name img category" // 'category' in MasterProduct schema
            })
            .populate({
                path: "shop",
                select: "shopName location category" // 'shopName', 'category' in Shop schema
            })
            .sort({ createdAt: -1 }); 

        let allFormattedItems = items.map(item => {
            const productRef = item.product || {};
            const shopRef = item.shop || {};
            const imgObj = productRef.img?.url ? productRef.img : (item.img?.url ? item.img : null);

            return {
                id: item._id,
                productName: productRef.name || item.name || "Unknown Product",
                shopName: shopRef.shopName || "Unknown Shop",
                shopId: shopRef._id, // NEW: Added shopId for redirection
                price: item.price,
                image: imgObj?.url || null,
                category: productRef.category || item.itemCategory || "",
                parentCategory: shopRef.category || "General",
                location: shopRef.location || "Nearby"
            };
        });

        if (category && category !== "All") {
            allFormattedItems = allFormattedItems.filter(item => 
                item.category && item.category.toLowerCase() === category.toLowerCase()
            );
        }

        // Limit removed: Now showing full matching dataset to allow for infinite scrolling potential or complete local listing
        const finalItems = allFormattedItems;

        // Define a prioritized list of 'Major' categories that users use most often.
        const MAJOR_CATEGORIES = [
            { name: "Staples & Grains", parent: "Grocery", icon: "🌾" },
            { name: "Fresh Vegetables", parent: "Vegetables & Fruits", icon: "🥦" },
            { name: "Dairy & Refrigerator", parent: "Grocery", icon: "🥛" },
            { name: "Men's Clothing", parent: "Fashion", icon: "👕" },
            { name: "Lighting", parent: "Electronics", icon: "💡" },
            { name: "Sports Shoes", parent: "Footwear", icon: "👟" },
            { name: "Smartphones", parent: "Mobile Shop", icon: "📱" },
            { name: "Medicines", parent: "Medical", icon: "💊" },
            { name: "Breads", parent: "Bakery", icon: "🍞" },
            { name: "Veg Dishes", parent: "Restaurant", icon: "🥗" },
            { name: "DJ and Tent", parent: "DJ/Events", icon: "🎵" }
        ];

        // Format SHOP_CATEGORIES for the 'More' modal (full list)
        const allSystemCategories = [
            { name: "All", parent: "General", icon: "📦" },
            ...MAJOR_CATEGORIES
        ];

        const seenNames = new Set(allSystemCategories.map(c => c.name));

        Object.entries(SHOP_CATEGORIES).forEach(([parent, children]) => {
            children.forEach(child => {
                if (!seenNames.has(child.name)) {
                    allSystemCategories.push({
                        name: child.name,
                        parent: parent,
                        icon: child.icon || "📦"
                    });
                    seenNames.add(child.name);
                }
            });
        });

        res.status(200).json({ items: finalItems, categories: allSystemCategories });
    } catch (error) {
        console.error("Error fetching homepage items:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

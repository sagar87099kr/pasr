const Item = require("../data/item");
const Shop = require("../data/shops");
const MasterProduct = require("../data/masterProduct");
const SHOP_CATEGORIES = require("../data/categories");

module.exports.getHomeItems = async (req, res) => {
    try {
        let { lat, lon, category, q, minDiscount, minPrice, maxPrice, sort, shopCategory, page, limit } = req.query;
        let userLocation = null;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;

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
        let query = { 
            isActive: true, 
            quantity: { $gt: 0 }
        };
        const allShops = await Shop.find().select('_id');
        const allShopIds = allShops.map(s => s._id);

        let bazaarId = null;
        if (req.headers['x-bazaar-id']) {
            bazaarId = req.headers['x-bazaar-id'];
        } else if (req.session && req.session.bazaarId) {
            bazaarId = req.session.bazaarId;
        }

        if (bazaarId) {
            // Strict assigned bazaar filtering
            let bazaarShops = await Shop.find({ bazaar: bazaarId }).select('_id');
            const shopIds = bazaarShops.map(s => s._id);
            query.shop = { $in: shopIds };
        } else if (userLocation && userLocation.coordinates && userLocation.coordinates.length === 2) {
            // Fallback: Find shops strictly within 10 km
            let nearbyShops = await Shop.find({
                geometry: {
                    $near: {
                        $geometry: { type: "Point", coordinates: userLocation.coordinates },
                        $maxDistance: 10000
                    }
                }
            }).select('_id');

            const shopIds = nearbyShops.map(s => s._id);
            query.shop = { $in: shopIds };
        } else {
            // If no location provided, filter by all shops globally
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
            
            // Calculate actual price for filtering and sorting
            const actualPrice = item.price && item.discount > 0 
                ? Math.round(item.price * (1 - item.discount / 100))
                : item.price;

            return {
                id: item._id,
                productName: productRef.name || item.name || "Unknown Product",
                shopName: shopRef.shopName || "Unknown Shop",
                shopId: shopRef._id,
                price: item.price,
                discount: item.discount || 0,
                actualPrice: actualPrice, // Pre-calculated for frontend use
                image: imgObj?.url || null,
                category: productRef.category || item.itemCategory || "",
                parentCategory: shopRef.category || "General",
                location: shopRef.location || "Nearby",
                createdAt: item.createdAt
            };
        });

        // Calculate distinct active categories BEFORE applying filters like shopCategory
        const activeCategories = [...new Set(allFormattedItems.map(item => item.parentCategory))].filter(Boolean);

        // --- Apply Professional Filters ---
        
        // 1. Search filter
        if (q) {
            const searchTerm = q.toLowerCase();
            allFormattedItems = allFormattedItems.filter(item => 
                item.productName.toLowerCase().includes(searchTerm) || 
                item.shopName.toLowerCase().includes(searchTerm) ||
                item.category.toLowerCase().includes(searchTerm)
            );
        }

        // 2. Category filter (Product Category)
        if (category && category !== "All") {
            allFormattedItems = allFormattedItems.filter(item => 
                item.category && item.category.toLowerCase() === category.toLowerCase()
            );
        }

        // 2b. Shop Category Filter
        if (shopCategory && shopCategory !== "All Shops") {
            allFormattedItems = allFormattedItems.filter(item => 
                item.parentCategory && item.parentCategory.toLowerCase() === shopCategory.toLowerCase()
            );
        }

        // 3. Discount filter
        if (minDiscount) {
            allFormattedItems = allFormattedItems.filter(item => item.discount >= parseInt(minDiscount));
        }

        // 4. Price range filter
        if (minPrice) {
            allFormattedItems = allFormattedItems.filter(item => item.actualPrice >= parseInt(minPrice));
        }
        if (maxPrice) {
            allFormattedItems = allFormattedItems.filter(item => item.actualPrice <= parseInt(maxPrice));
        }

        // --- Apply Sorting ---
        if (sort === 'price_asc') {
            allFormattedItems.sort((a, b) => a.actualPrice - b.actualPrice);
        } else if (sort === 'price_desc') {
            allFormattedItems.sort((a, b) => b.actualPrice - a.actualPrice);
        } else if (sort === 'discount_desc') {
            allFormattedItems.sort((a, b) => b.discount - a.discount);
        } else {
            // Default: Newest
            allFormattedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = pageNum * limitNum;
        const paginatedItems = allFormattedItems.slice(startIndex, endIndex);
        const hasMore = endIndex < allFormattedItems.length;

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

        res.status(200).json({ items: paginatedItems, hasMore, categories: allSystemCategories, activeCategories });
    } catch (error) {
        console.error("Error fetching homepage items:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

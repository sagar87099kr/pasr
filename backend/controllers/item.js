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
        const skipNum = (pageNum - 1) * limitNum;

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

        let bazaarId = null;
        if (req.headers['x-bazaar-id']) {
            bazaarId = req.headers['x-bazaar-id'];
        } else if (req.session && req.session.bazaarId) {
            bazaarId = req.session.bazaarId;
        }

        let shopIds = null;

        if (bazaarId) {
            let bazaarShops = await Shop.find({ bazaar: bazaarId, verified: true, isActive: true }).select('_id');
            shopIds = bazaarShops.map(s => s._id);
            query.shop = { $in: shopIds };
        } else if (userLocation && userLocation.coordinates && userLocation.coordinates.length === 2) {
            let nearbyShops = await Shop.find({
                geometry: {
                    $near: {
                        $geometry: { type: "Point", coordinates: userLocation.coordinates },
                        $maxDistance: 10000
                    }
                },
                verified: true,
                isActive: true
            }).select('_id');
            shopIds = nearbyShops.map(s => s._id);
            query.shop = { $in: shopIds };
        }

        if (minDiscount) {
            query.discount = { $gte: parseInt(minDiscount) };
        }

        if (category && category !== "All") {
            const products = await MasterProduct.find({ category: new RegExp('^' + category + '$', 'i') }).select('_id');
            query.product = { $in: products.map(p => p._id) };
        }

        if (shopCategory && shopCategory !== "All Shops") {
            const categoryShops = await Shop.find({ category: new RegExp('^' + shopCategory + '$', 'i') }).select('_id');
            const categoryShopIds = categoryShops.map(s => s._id.toString());
            
            if (query.shop && query.shop.$in) {
                const intersection = query.shop.$in.filter(id => categoryShopIds.includes(id.toString()));
                query.shop.$in = intersection;
            } else {
                query.shop = { $in: categoryShops.map(s => s._id) };
            }
        }

        if (q) {
            const searchTerm = q.toLowerCase();
            const matchingProducts = await MasterProduct.find({ name: { $regex: searchTerm, $options: 'i' }, verified: true }).select('_id');
            const matchingShops = await Shop.find({ shopName: { $regex: searchTerm, $options: 'i' }, verified: true, isActive: true }).select('_id');
            
            query.$or = [
                { name: { $regex: searchTerm, $options: 'i' } },
                { itemCategory: { $regex: searchTerm, $options: 'i' } },
                { product: { $in: matchingProducts.map(p => p._id) } },
                { shop: { $in: matchingShops.map(s => s._id) } }
            ];
            
            if (query.shop) {
                const originalShopFilter = query.shop;
                delete query.shop;
                query.$and = [{ shop: originalShopFilter }];
            }
        }

        if (minPrice || maxPrice) {
            const computedPriceExpr = {
                $cond: {
                    if: { $gt: ["$discount", 0] },
                    then: { $subtract: ["$price", { $divide: [{ $multiply: ["$price", "$discount"] }, 100] }] },
                    else: "$price"
                }
            };
            
            query.$expr = { $and: [] };
            if (minPrice) query.$expr.$and.push({ $gte: [computedPriceExpr, parseInt(minPrice)] });
            if (maxPrice) query.$expr.$and.push({ $lte: [computedPriceExpr, parseInt(maxPrice)] });
        }

        let sortQuery = { createdAt: -1 };
        if (sort === 'discount_desc') {
            sortQuery = { discount: -1, createdAt: -1 };
        } else if (sort === 'price_asc' || sort === 'price_desc') {
            sortQuery = { price: sort === 'price_asc' ? 1 : -1 };
        }

        const items = await Item.find(query)
            .populate({ path: "product", select: "name img category" })
            .populate({ path: "shop", select: "shopName location category" })
            .sort(sortQuery)
            .skip(skipNum)
            .limit(limitNum + 1); 

        const hasMore = items.length > limitNum;
        if (hasMore) items.pop();

        let allFormattedItems = items.map(item => {
            const productRef = item.product || {};
            const shopRef = item.shop || {};
            const imgObj = productRef.img?.url ? productRef.img : (item.img?.url ? item.img : null);
            
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
                actualPrice: actualPrice,
                image: imgObj?.url || null,
                category: productRef.category || item.itemCategory || "",
                parentCategory: shopRef.category || "General",
                location: shopRef.location || "Nearby",
                createdAt: item.createdAt
            };
        });

        if (sort === 'price_asc') {
            allFormattedItems.sort((a, b) => a.actualPrice - b.actualPrice);
        } else if (sort === 'price_desc') {
            allFormattedItems.sort((a, b) => b.actualPrice - a.actualPrice);
        }

        const activeCategories = [...new Set(allFormattedItems.map(item => item.parentCategory))].filter(Boolean);

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

        const allSystemCategories = [{ name: "All", parent: "General", icon: "📦" }, ...MAJOR_CATEGORIES];
        const seenNames = new Set(allSystemCategories.map(c => c.name));

        Object.entries(SHOP_CATEGORIES).forEach(([parent, children]) => {
            children.forEach(child => {
                if (!seenNames.has(child.name)) {
                    allSystemCategories.push({ name: child.name, parent: parent, icon: child.icon || "📦" });
                    seenNames.add(child.name);
                }
            });
        });

        res.status(200).json({ items: allFormattedItems, hasMore, categories: allSystemCategories, activeCategories });
    } catch (error) {
        console.error("Error fetching homepage items:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

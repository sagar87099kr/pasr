const Item = require("../data/item");
const Shop = require("../data/shops");
const MasterProduct = require("../data/masterProduct");
const Customer = require("../data/customers");
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
            quantity: { $gt: 0 },
            isAddon: { $ne: true }
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

        if (shopCategory && shopCategory !== "All Shops" && shopCategory !== "For You" && shopCategory !== "All Products") {
            const rawCategories = shopCategory.split(',').map(c => c.trim()).filter(Boolean);
            const categoryRegexes = rawCategories.map(c => new RegExp('^' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'));

            const categoryShops = await Shop.find({
                category: { $in: categoryRegexes },
                verified: true,
                isActive: true
            }).select('_id');
            const categoryShopIds = categoryShops.map(s => s._id.toString());

            if (query.shop && query.shop.$in) {
                const existingShopIds = query.shop.$in.map(id => id.toString());
                const matchingShopIds = categoryShopIds.filter(id => existingShopIds.includes(id));
                query.shop = { $in: matchingShopIds };
            } else {
                query.shop = { $in: categoryShopIds };
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

        let sortQuery = { discount: -1, createdAt: -1 };
        if (sort === 'discount_desc') {
            sortQuery = { discount: -1, createdAt: -1 };
        } else if (sort === 'price_asc' || sort === 'price_desc') {
            sortQuery = { price: sort === 'price_asc' ? 1 : -1 };
        } else if (sort === 'newest') {
            sortQuery = { createdAt: -1 };
        }

        let items = [];
        let hasMore = false;

        const isHomeFeed = (!shopCategory || shopCategory === "All Shops" || shopCategory === "For You" || shopCategory === "All Products") && !q && !category && !minPrice && !maxPrice && !minDiscount && pageNum === 1;

        if (isHomeFeed) {
            // 1. Fetch top discounted items across all shops (highest discount first)
            const discountedItems = await Item.find({ ...query, discount: { $gt: 0 } })
                .populate({ path: "product", select: "name img category" })
                .populate({ path: "shop", select: "shopName location category bazaar" })
                .sort({ discount: -1, createdAt: -1 })
                .limit(60);

            // 2. Fetch food category items (even if discount is 0) so Food segment is never empty
            const foodShops = await Shop.find({
                category: { $in: [/food/i, /restaurant/i, /dhaba/i, /bakery/i, /sweet/i, /cafe/i, /fast food/i, /dining/i] },
                verified: true,
                isActive: true
            }).select('_id');
            const foodShopIds = foodShops.map(s => s._id);

            const foodItems = await Item.find({ 
                isActive: true, 
                quantity: { $gt: 0 },
                shop: { $in: foodShopIds }
            })
                .populate({ path: "product", select: "name img category" })
                .populate({ path: "shop", select: "shopName location category bazaar" })
                .sort({ discount: -1, createdAt: -1 })
                .limit(30);

            // 3. Fetch Automobile items explicitly so Automobile segment is always populated
            const autoShops = await Shop.find({
                $or: [
                    { category: { $in: [/auto/i, /garage/i, /bike/i, /motor/i, /cycle/i, /workshop/i, /lubricant/i] } },
                    { shopName: { $in: [/auto/i, /garage/i, /bike/i, /motor/i, /cycle/i, /workshop/i, /lubricant/i] } }
                ],
                verified: true,
                isActive: true
            }).select('_id');
            const autoShopIds = autoShops.map(s => s._id);

            const autoItems = await Item.find({
                isActive: true,
                quantity: { $gt: 0 },
                $or: [
                    { shop: { $in: autoShopIds } },
                    { itemCategory: { $in: [/parts/i, /lubricant/i, /oil/i, /auto/i, /bike/i, /car/i, /tyre/i, /tire/i] } }
                ]
            })
                .populate({ path: "product", select: "name img category" })
                .populate({ path: "shop", select: "shopName location category bazaar" })
                .sort({ createdAt: -1 })
                .limit(30);

            // 4. Fetch regular items across all other active shops
            const regularItems = await Item.find(query)
                .populate({ path: "product", select: "name img category" })
                .populate({ path: "shop", select: "shopName location category bazaar" })
                .sort({ createdAt: -1 })
                .limit(200);

            const seenItemIds = new Set();
            for (const it of [...discountedItems, ...foodItems, ...autoItems, ...regularItems]) {
                const idStr = String(it._id);
                if (!seenItemIds.has(idStr)) {
                    seenItemIds.add(idStr);
                    items.push(it);
                }
            }
            hasMore = false;
        } else {
            items = await Item.find(query)
                .populate({ path: "product", select: "name img category" })
                .populate({ path: "shop", select: "shopName location category bazaar" })
                .sort(sortQuery)
                .skip(skipNum)
                .limit(limitNum + 1); 

            hasMore = items.length > limitNum;
            if (hasMore) items.pop();
        }

        let orderCountMap = {};
        try {
            const Order = require("../data/order");
            const orderCounts = await Order.aggregate([
                { $unwind: "$items" },
                { $group: { _id: "$items.itemId", totalBought: { $sum: { $ifNull: ["$items.quantity", 1] } } } }
            ]);
            for (const oc of orderCounts) {
                if (oc._id) orderCountMap[String(oc._id)] = oc.totalBought;
            }
        } catch (e) {
            console.error("Error aggregating order counts:", e);
        }

        let allFormattedItems = items.map(item => {
            const productRef = item.product || {};
            const shopRef = item.shop || {};
            const imgObj = productRef.img?.url ? productRef.img : (item.img?.url ? item.img : null);
            
            const actualPrice = item.price && item.discount > 0 
                ? Math.round(item.price * (1 - item.discount / 100))
                : item.price;

            const itemIdStr = String(item._id);
            const totalOrders = orderCountMap[itemIdStr] || 0;

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
                shopCategory: shopRef.category || "",
                parentCategory: shopRef.category || "General",
                location: shopRef.location || "Nearby",
                salesCount: totalOrders,
                orderCount: totalOrders,
                createdAt: item.createdAt
            };
        });

        if (shopCategory) {
            const scLower = shopCategory.toLowerCase();
            if (scLower.includes('grocery') && !scLower.includes('food') && !scLower.includes('restaurant')) {
                const NON_GROCERY_RE = /\b(toy|bike|bicycle|bag|trolley|backpack|purse|frock|kurti|saree|shirt|pant|jeans|shoe|slipper|sandal|chasma|sunglass|spectacle|eraser|spinner|clock|watch|photo\s*frame|rakhi|party\s*popper|snow\s*spray|cosmetic|sringar|lipstick|bindi|earring|necklace|jewel|helmet|cloth\s*clip|engine\s*oil|mobil|castrol|fertilizer|pesticide|cement|pipe)\b/i;
                allFormattedItems = allFormattedItems.filter(item => {
                    const combined = `${item.productName} ${item.category} ${item.shopCategory}`.toLowerCase();
                    return !NON_GROCERY_RE.test(combined);
                });
            } else if (scLower.includes('food') || scLower.includes('restaurant') || scLower.includes('dhaba') || scLower.includes('bakery') || scLower.includes('sweet')) {
                const NON_FOOD_RE = /\b(bike|bicycle|tyre|tire|lubricant|engine\s*oil|castrol|mobil|clutch|brake\s*shoe|bearing|saree|kurti|shirt|pant|jeans|t-shirt|trouser|shoe|slipper|sandal|heel|boot|lipstick|kajal|makeup|cosmetic|shampoo|soap|detergent|surf|tablet|syrup|capsule|fertilizer|pesticide|seed|cement|paint|pipe|switch|wire|inverter|bulb)\b/i;
                allFormattedItems = allFormattedItems.filter(item => {
                    const combined = `${item.productName} ${item.category} ${item.shopCategory}`.toLowerCase();
                    return !NON_FOOD_RE.test(combined);
                });
            } else if (scLower.includes('auto') || scLower.includes('garage') || scLower.includes('motor')) {
                const NON_AUTO_RE = /\b(saree|kurti|shirt|pant|frock|dress|kurta|food|biryani|roll|pizza|burger|chowmein|momo|sweet|mithai|dosa|idli|fruits|apple|banana|mango|vegetables|potato|tomato|onion|atta|rice|dal|sugar|salt|mustard\s*oil|refined\s*oil|edible\s*oil|ghee|medicine|tablet|syrup|capsule)\b/i;
                allFormattedItems = allFormattedItems.filter(item => {
                    const combined = `${item.productName} ${item.category} ${item.shopCategory}`.toLowerCase();
                    return !NON_AUTO_RE.test(combined);
                });
            } else if (scLower.includes('fashion') || scLower.includes('clothes') || scLower.includes('garments')) {
                const NON_FASHION_RE = /\b(food|biryani|roll|pizza|burger|chowmein|momo|sweet|mithai|dosa|idli|fruits|vegetables|atta|rice|dal|oil|ghee|engine\s*oil|mobil|castrol|tyre|tube|helmet|medicine|tablet|syrup|capsule|fertilizer|pesticide|cement|paint|pipe|switch|wire)\b/i;
                allFormattedItems = allFormattedItems.filter(item => {
                    const combined = `${item.productName} ${item.category} ${item.shopCategory}`.toLowerCase();
                    return !NON_FASHION_RE.test(combined);
                });
            } else if (scLower.includes('footwear') || scLower.includes('shoes')) {
                const FOOTWEAR_RE = /\b(shoe|shoes|slipper|slippers|sandal|sandals|flip\s*flop|heels|flats|boots|sneaker|sneakers|mojari|jutti|crocs|chappal|socks)\b/i;
                allFormattedItems = allFormattedItems.filter(item => {
                    const combined = `${item.productName} ${item.category} ${item.shopCategory}`.toLowerCase();
                    return FOOTWEAR_RE.test(combined);
                });
            } else if (scLower.includes('medical') || scLower.includes('pharmacy')) {
                const NON_MED_RE = /\b(saree|kurti|shirt|pant|frock|shoe|slipper|bike|engine\s*oil|biryani|roll|pizza|burger|chowmein|momo|fruits|vegetables|fertilizer|pesticide|cement|pipe)\b/i;
                allFormattedItems = allFormattedItems.filter(item => {
                    const combined = `${item.productName} ${item.category} ${item.shopCategory}`.toLowerCase();
                    return !NON_MED_RE.test(combined);
                });
            }
        }

        if (sort === 'price_asc') {
            allFormattedItems.sort((a, b) => a.actualPrice - b.actualPrice);
        } else if (sort === 'price_desc') {
            allFormattedItems.sort((a, b) => b.actualPrice - a.actualPrice);
        } else {
            // Rank by salesCount (order history) descending, then discount descending
            allFormattedItems.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0) || (b.discount || 0) - (a.discount || 0));
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

        // ── Time-Contextual Recommendations (Morning, Afternoon, Evening) ──
        let timeContextualItems = [];
        try {
            // Calculate IST hour
            const now = new Date();
            const istHour = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;

            let masterProductKeywords = [];
            let masterProductCategories = [];

            if (istHour >= 5 && istHour < 12) {
                // Morning (5 AM - 12 PM): Strictly Fruits, Milk, Curd, Dahi, Butter, Bread
                masterProductKeywords = ['fruit', 'apple', 'banana', 'mango', 'orange', 'grape', 'papaya', 'guava', 'pomegranate', 'anar', 'kela', 'seb', 'watermelon', 'pineapple', 'mosambi', 'milk', 'curd', 'dahi', 'butter', 'bread', 'toast', 'oats', 'tea', 'chai', 'coffee'];
                masterProductCategories = ['Fruit', 'Fruits', 'Dairy', 'Milk', 'Curd', 'Bread', 'Breakfast'];
            } else if (istHour >= 12 && istHour < 17) {
                // Afternoon: Cakes, Ice cream, Cold drinks, Shakes, Pastries, Sweets
                masterProductKeywords = ['cake', 'pastry', 'browni', 'ice cream', 'icecream', 'magnum', 'feast', 'cup', 'cadbury', 'cold drink', 'colddrink', 'coke', 'pepsi', 'sprite', 'thums up', 'frooti', 'maaza', 'juice', 'shake', 'cooler', 'lassi', 'kulfi', '7up', 'red bull', 'hell', 'vanilla', 'butterscotch', 'chocolate', 'thali', 'rice', 'meal', 'lunch'];
                masterProductCategories = ['Cake', 'Pastry', 'Ice Cream', 'Bakery', 'Beverage', 'Cooler', 'Food', 'Restaurant', 'Dhaba', 'Sweet Shop'];
            } else {
                // Evening: Biryani, Roll, Pizza, Burger, Fast Food, Momos, Snacks
                masterProductKeywords = ['biryani', 'roll', 'pizza', 'burger', 'momo', 'noodle', 'chowmein', 'samosa', 'chaat', 'kachori', 'kebab', 'tikka', 'fast food', 'fried rice', 'snack', 'paneer', 'chicken'];
                masterProductCategories = ['Chinese', 'Fast Food', 'Non-Veg', 'Veg Dishes', 'Snacks', 'Food', 'Restaurant'];
            }

            const regexPattern = masterProductKeywords.join('|');
            const catPattern = masterProductCategories.join('|');

            // Find matching MasterProducts
            const matchedMasterProducts = await MasterProduct.find({
                $or: [
                    { name: { $regex: regexPattern, $options: 'i' } },
                    { category: { $regex: catPattern, $options: 'i' } }
                ]
            }).select('_id').lean();

            const matchedProductIds = matchedMasterProducts.map(p => p._id);

            const rawTimeItems = await Item.find({
                isActive: true,
                quantity: { $gt: 0 },
                $or: [
                    { product: { $in: matchedProductIds } },
                    { name: { $regex: regexPattern, $options: 'i' } },
                    { itemCategory: { $regex: catPattern, $options: 'i' } }
                ]
            })
            .populate({ path: "product", select: "name img category" })
            .populate({ path: "shop", select: "shopName location category" })
            .limit(100);

            let formattedTimeItems = rawTimeItems
                .filter(item => {
                    const shopName = (item.shop?.shopName || '').toLowerCase();
                    const shopCat = (item.shop?.category || '').toLowerCase();
                    const itemCat = (item.itemCategory || item.product?.category || '').toLowerCase();
                    const name = (item.name || item.product?.name || '').toLowerCase();

                    // Never include Fuggi/Fuggy
                    if (shopName.includes('fuggi') || shopName.includes('fuggy')) return false;

                    // Strictly exclude non-food categories
                    const excludedCats = ['beauty', 'cosmetics', 'fashion', 'hardware', 'electronics', 'automobile', 'jewelers', 'footwear', 'printing', 'stationery', 'furniture'];
                    if (excludedCats.some(ec => shopCat.includes(ec) || itemCat.includes(ec))) return false;

                    // Exclude non-food keywords
                    const excludedKeywords = ['lotion', 'oil', 'soap', 'shampoo', 'serum', 'facewash', 'face cream', 'iron', 'wire', 'pipe', 'shoe'];
                    if (excludedKeywords.some(ek => name.includes(ek) && !name.includes('ice cream') && !name.includes('icecream') && !name.includes('cream swiss'))) return false;

                    // MORNING STRICT RULES: NEVER allow rolls, chili, noodles, tikka, curries, fast foods, chocolates, biscuits, cakes, or spices
                    if (istHour >= 5 && istHour < 12) {
                        const morningExcluded = ['dairy milk', 'kit kat', 'kitkat', 'candy', 'dosa', 'idli', 'chole', 'bhature', 'roll', 'rolls', 'chilly', 'chilli', 'chowmin', 'chowmein', 'noodle', 'noodles', 'tikka', 'kebab', 'kabab', 'biryani', 'fried rice', 'manchurian', 'burger', 'pizza', 'momo', 'curry', 'gravy', 'mirch', 'masala', 'mashala', 'powder', 'detergent', 'surf', 'maggi', 'biscuit', 'biskit', 'cookie', 'cookies', 'cake', 'pastry', 'chips', 'namkeen', 'paneer', 'chicken', 'mutton', 'egg', 'fish', 'deggi', 'chocolate', 'silk', 'cadbury', 'naan', 'nan', 'roti', 'paratha', 'scotch', 'vada', 'chaat', 'samosa', 'kachori', 'dal', 'oil', 'flour'];
                        if (morningExcluded.some(me => name.includes(me) || itemCat.includes(me))) return false;

                        // Only allow pure fruits, fresh milk, curd, dahi, butter, bread
                        const morningAllowed = ['fruit', 'apple', 'banana', 'mango', 'orange', 'grape', 'papaya', 'guava', 'pomegranate', 'anar', 'kela', 'seb', 'watermelon', 'pineapple', 'mosambi', 'milk', 'curd', 'dahi', 'butter', 'bread', 'toast', 'oats', 'cornflakes', 'tea', 'chai', 'coffee'];
                        const isAllowedMorning = morningAllowed.some(ma => name.includes(ma) || itemCat.includes(ma) || shopCat.includes('fruit') || shopCat.includes('dairy'));
                        if (!isAllowedMorning) return false;
                    }

                    return true;
                })
                .map(item => {
                    const productRef = item.product || {};
                    const shopRef = item.shop || {};
                    const imgObj = productRef.img?.url ? productRef.img : (item.img?.url ? item.img : null);
                    const actualPrice = item.price && item.discount > 0 
                        ? Math.round(item.price * (1 - item.discount / 100))
                        : item.price;
                    const itemIdStr = String(item._id);
                    const totalOrders = orderCountMap[itemIdStr] || 0;

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
                        shopCategory: shopRef.category || "",
                        parentCategory: shopRef.category || "General",
                        location: shopRef.location || "Nearby",
                        salesCount: totalOrders,
                        orderCount: totalOrders,
                        createdAt: item.createdAt
                    };
                });

            // Priority sort:
            if (istHour >= 5 && istHour < 12) {
                // In morning: Prioritize Fruits first (apple, banana, fruits), then Milk & Curd/Dairy
                formattedTimeItems.sort((a, b) => {
                    const nameA = a.productName.toLowerCase();
                    const nameB = b.productName.toLowerCase();
                    const isFruitA = /fruit|apple|banana|mango|orange|grape|papaya|guava|seb|kela/i.test(nameA);
                    const isFruitB = /fruit|apple|banana|mango|orange|grape|papaya|guava|seb|kela/i.test(nameB);
                    if (isFruitA && !isFruitB) return -1;
                    if (!isFruitA && isFruitB) return 1;
                    return (b.salesCount || 0) - (a.salesCount || 0) || (b.discount || 0) - (a.discount || 0);
                });
            } else if (istHour >= 12 && istHour < 17) {
                // In afternoon: Prioritize JHUNU SANU cakes/icecreams first
                formattedTimeItems.sort((a, b) => {
                    const isJhunuA = /jhunu|junnu|sanu/i.test(a.shopName);
                    const isJhunuB = /jhunu|junnu|sanu/i.test(b.shopName);
                    if (isJhunuA && !isJhunuB) return -1;
                    if (!isJhunuA && isJhunuB) return 1;
                    return (b.salesCount || 0) - (a.salesCount || 0) || (b.discount || 0) - (a.discount || 0);
                });
            } else {
                formattedTimeItems.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0) || (b.discount || 0) - (a.discount || 0));
            }

            timeContextualItems = formattedTimeItems.slice(0, 15);
        } catch (err) {
            console.error("Error generating timeContextualItems:", err);
        }

        res.status(200).json({ 
            items: allFormattedItems, 
            timeContextualItems,
            hasMore, 
            categories: allSystemCategories, 
            activeCategories 
        });
    } catch (error) {
        console.error("Error fetching homepage items:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

module.exports.getPasrStoreItems = async (req, res) => {
    try {
        let { page, limit, subCategory, q, sort } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skipNum = (pageNum - 1) * limitNum;

        // 1. Locate APNI DUKAN grocery store or registered dark store
        let pasrShop = await Shop.findOne({
            $or: [
                { shopName: /^APNI DUKAN$/i },
                { shopName: /APNI DUKAN/i },
                { _id: "6ab128a35020dce6540c1cd9" },
                { shopName: /^Apni Dukaan$/i },
                { shopName: /^PASR Store$/i },
                { isDarkStore: true }
            ]
        }).populate("owner", "username name phone");

        if (!pasrShop) {
            let adminUser = await Customer.findOne({ role: "admin" }) || await Customer.findOne();
            if (!adminUser) {
                adminUser = await Customer.create({ username: 9999999999, name: "Apni Dukan Admin" });
            }
            pasrShop = await Shop.create({
                shopName: "APNI DUKAN",
                shopDescription: "Get all type of groceries in one place. Express Delivery & Direct Store Pickup.",
                category: "Grocery",
                location: "Near v2 mall raj Dhanwar",
                geometry: { type: "Point", coordinates: [77.209, 28.6139] },
                shopImage: [{ url: "https://res.cloudinary.com/dkthfpcrb/image/upload/v1789995171/pasr_DEV/exuoi9k6yaerioletdah.webp", filename: "apni_dukan_banner" }],
                verified: true,
                isActive: true,
                isDarkStore: true,
                openingTime: "06:15",
                closingTime: "21:00",
                owner: adminUser ? adminUser._id : null
            });
        }

        const totalItems = await Item.countDocuments({ shop: pasrShop._id });

        // Build query strictly scoped to this shop
        let query = {
            shop: pasrShop._id,
            isActive: true,
            quantity: { $gt: 0 }
        };

        if (subCategory && subCategory !== "All") {
            const subCatRe = new RegExp(subCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [
                { itemCategory: subCatRe },
                { name: subCatRe },
                { description: subCatRe }
            ];
        }

        if (q) {
            const qRe = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$and = [
                {
                    $or: [
                        { name: qRe },
                        { itemCategory: qRe },
                        { description: qRe }
                    ]
                }
            ];
        }

        let sortQuery = { createdAt: -1 };
        if (sort === 'price_asc') sortQuery = { price: 1 };
        else if (sort === 'price_desc') sortQuery = { price: -1 };
        else if (sort === 'discount_desc') sortQuery = { discount: -1, createdAt: -1 };

        const items = await Item.find(query)
            .populate({ path: "product", select: "name img category" })
            .sort(sortQuery)
            .skip(skipNum)
            .limit(limitNum + 1);

        const hasMore = items.length > limitNum;
        if (hasMore) items.pop();

        const shopDisplayName = pasrShop.shopName || "APNI DUKAN";
        const formattedItems = items.map(item => {
            const productRef = item.product || {};
            const imgObj = item.img?.url ? item.img : (productRef.img?.url ? productRef.img : null);
            const actualPrice = item.price && item.discount > 0 
                ? Math.round(item.price * (1 - item.discount / 100))
                : item.price;

            return {
                id: item._id,
                _id: item._id,
                productName: item.name || productRef.name || "Apni Dukan Product",
                name: item.name || productRef.name || "Apni Dukan Product",
                shopName: shopDisplayName,
                shopId: pasrShop._id,
                price: item.price,
                discount: item.discount || 0,
                actualPrice: actualPrice,
                image: imgObj?.url || null,
                category: item.itemCategory || productRef.category || "Grocery",
                unit: item.sizes && item.sizes.length > 0 ? item.sizes[0] : "",
                isDarkStore: true,
                salesCount: 10,
                createdAt: item.createdAt
            };
        });

        res.status(200).json({
            success: true,
            items: formattedItems,
            hasMore,
            totalCount: totalItems,
            shop: {
                id: pasrShop._id,
                _id: pasrShop._id,
                shopName: pasrShop.shopName,
                shopDescription: pasrShop.shopDescription || "Get all type of groceries in one place.",
                location: pasrShop.location || "Near v2 mall raj Dhanwar",
                category: pasrShop.category || "Grocery",
                openingTime: pasrShop.openingTime || "06:15",
                closingTime: pasrShop.closingTime || "21:00",
                shopImage: pasrShop.shopImage || [],
                verified: pasrShop.verified !== false,
                isActive: pasrShop.isActive !== false,
                upiId: pasrShop.upiId || "",
                ownerPhone: pasrShop.owner?.phone || pasrShop.owner?.username || ""
            }
        });
    } catch (error) {
        console.error("Error fetching Apni Dukan items:", error);
        res.status(500).json({ success: false, message: "Error fetching Apni Dukan items", error: error.message });
    }
};

module.exports.getApnaStoreItems = module.exports.getPasrStoreItems;
module.exports.getApniDukanItems = module.exports.getPasrStoreItems;

module.exports.addPasrStoreItem = async (req, res) => {
    try {
        const { name, price, discount, itemCategory, description, quantity, imageUrl, unit, sizes } = req.body;
        if (!name || !price) {
            return res.status(400).json({ success: false, message: "Name and Price are required" });
        }

        let pasrShop = await Shop.findOne({
            $or: [
                { shopName: /^APNI DUKAN$/i },
                { shopName: /APNI DUKAN/i },
                { _id: "6ab128a35020dce6540c1cd9" },
                { shopName: /^PASR Store$/i },
                { isDarkStore: true }
            ]
        });
        if (!pasrShop) {
            return res.status(404).json({ success: false, message: "Apni Dukan shop not found" });
        }

        const newItem = await Item.create({
            name,
            price: parseFloat(price),
            discount: parseInt(discount) || 0,
            itemCategory: itemCategory || "Grocery",
            description: description || "",
            quantity: parseInt(quantity) || 50,
            img: imageUrl ? { url: imageUrl } : undefined,
            sizes: sizes || (unit ? [unit] : []),
            shop: pasrShop._id,
            isActive: true,
            isDarkStore: true,
            isVerified: true
        });

        res.status(201).json({ success: true, item: newItem, message: "Item listed in Apni Dukan successfully" });
    } catch (error) {
        console.error("Error adding Apni Dukan item:", error);
        res.status(500).json({ success: false, message: "Error adding Apni Dukan item", error: error.message });
    }
};

module.exports.addApniDukanItem = module.exports.addPasrStoreItem;
module.exports.addApnaStoreItem = module.exports.addPasrStoreItem;

module.exports.deletePasrStoreItem = async (req, res) => {
    try {
        const { id } = req.params;
        await Item.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Item removed from Apni Dukan successfully" });
    } catch (error) {
        console.error("Error deleting Apni Dukan item:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports.deleteApniDukanItem = module.exports.deletePasrStoreItem;
module.exports.deleteApnaStoreItem = module.exports.deletePasrStoreItem;



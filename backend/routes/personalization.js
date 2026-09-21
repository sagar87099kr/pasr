const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/wrapAsync");
const Customer = require("../data/customers");
const Order = require("../data/order");
const Item = require("../data/item");
const Shop = require("../data/shops");
const ServiceProvider = require("../data/serviceproviders");

/**
 * Determine dynamic greeting and time-of-day contextual info (IST timezone)
 */
function getGreetingInfo(userName) {
    // Current hour in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getUTCHours();

    let greetingPrefix = "Good evening";
    let period = "evening";
    let timeHighlights = ["Snacks", "Grocery", "Dinner", "Local Shops"];

    if (hour >= 5 && hour < 12) {
        greetingPrefix = "Good morning";
        period = "morning";
        timeHighlights = ["Dairy & Milk", "Fresh Vegetables", "Bakery", "Breakfast Essentials"];
    } else if (hour >= 12 && hour < 17) {
        greetingPrefix = "Good afternoon";
        period = "afternoon";
        timeHighlights = ["Lunch & Fast Food", "Grocery Refill", "Home Services", "Local Shops"];
    } else if (hour >= 17 && hour < 22) {
        greetingPrefix = "Good evening";
        period = "evening";
        timeHighlights = ["Evening Snacks", "Daily Staples", "Bakery", "Restaurant"];
    } else {
        greetingPrefix = "Welcome";
        period = "night";
        timeHighlights = ["Quick Delivery", "Grocery", "Emergency Medical", "Explore"];
    }

    const name = userName ? userName.split(' ')[0] : '';
    const fullGreeting = name ? `${greetingPrefix}, ${name} 👋` : `${greetingPrefix} 👋`;

    return { fullGreeting, greetingPrefix, period, timeHighlights };
}

/**
 * Categorize persona shortcuts based on inferred user persona
 */
function getCategoryShortcuts(persona = 'GENERAL', timePeriod = 'morning') {
    switch (persona) {
        case 'GROCERY':
            return [
                { name: 'Grocery', icon: 'shopping_basket', isHighlight: true },
                { name: 'Vegetables & Fruits', icon: 'eco', isHighlight: false },
                { name: 'Bakery', icon: 'bakery_dining', isHighlight: false },
                { name: 'General Store', icon: 'storefront', isHighlight: false },
                { name: 'Sweet Shop', icon: 'cake', isHighlight: false },
                { name: 'Explore All', icon: 'grid_view', isSpecial: true }
            ];
        case 'SERVICES':
            return [
                { name: 'Electrician', icon: 'bolt', isHighlight: true },
                { name: 'Plumber', icon: 'plumbing', isHighlight: false },
                { name: 'Carpenter', icon: 'handyman', isHighlight: false },
                { name: 'Painter', icon: 'format_paint', isHighlight: false },
                { name: 'Home Services', icon: 'home_repair_service', isHighlight: false },
                { name: 'Explore All', icon: 'grid_view', isSpecial: true }
            ];
        case 'KISAN':
            return [
                { name: 'Kisan Sabha', icon: 'agriculture', isHighlight: true },
                { name: 'Seeds & Fertilizers', icon: 'grass', isHighlight: false },
                { name: 'Farm Equipment', icon: 'precision_manufacturing', isHighlight: false },
                { name: 'Local Bazaar', icon: 'store', isHighlight: false },
                { name: 'Hardware', icon: 'hardware', isHighlight: false },
                { name: 'Explore All', icon: 'grid_view', isSpecial: true }
            ];
        default: // GENERAL / New User
            return [
                { name: 'Grocery', icon: 'shopping_basket', isHighlight: true },
                { name: 'Vegetables & Fruits', icon: 'eco', isHighlight: false },
                { name: 'Mobile Shop', icon: 'smartphone', isHighlight: false },
                { name: 'Home Services', icon: 'home_repair_service', isHighlight: false },
                { name: 'Fashion', icon: 'checkroom', isHighlight: false },
                { name: 'Explore All', icon: 'grid_view', isSpecial: true }
            ];
    }
}

/**
 * Infer persona from category affinities map
 */
function calculatePersona(affinitiesMap) {
    if (!affinitiesMap || affinitiesMap.size === 0) return 'GENERAL';

    let groceryScore = 0;
    let serviceScore = 0;
    let kisanScore = 0;
    let total = 0;

    const groceryCats = ['grocery', 'vegetables & fruits', 'bakery', 'general store', 'sweet shop', 'dairy', 'staples', 'non-veg'];
    const serviceCats = ['electrician', 'plumber', 'carpenter', 'painter', 'home services', 'salon', 'repair'];
    const kisanCats = ['kisan sabha', 'seeds & fertilizers', 'farm equipment', 'agriculture', 'tractor'];

    for (let [cat, count] of (affinitiesMap instanceof Map ? affinitiesMap.entries() : Object.entries(affinitiesMap))) {
        const lowerCat = String(cat).toLowerCase();
        const cnt = Number(count) || 1;
        total += cnt;

        if (groceryCats.some(g => lowerCat.includes(g))) groceryScore += cnt;
        if (serviceCats.some(s => lowerCat.includes(s))) serviceScore += cnt;
        if (kisanCats.some(k => lowerCat.includes(k))) kisanScore += cnt;
    }

    if (total === 0) return 'GENERAL';
    if (groceryScore / total >= 0.45) return 'GROCERY';
    if (serviceScore / total >= 0.35) return 'SERVICES';
    if (kisanScore / total >= 0.35) return 'KISAN';
    return 'GENERAL';
}

/**
 * GET /api/personalization/home
 * Returns the fully aggregated personalized home feed
 */
router.get("/home", catchAsync(async (req, res) => {
    const user = req.user;
    const { bazaar, lat, lon } = req.query;

    const userName = user ? user.name : null;
    const greetingInfo = getGreetingInfo(userName);

    let persona = 'GENERAL';
    let recentlyViewed = [];
    let recentSearches = [];

    if (user && user.personalization) {
        persona = user.personalization.persona || 'GENERAL';
        recentlyViewed = user.personalization.recentlyViewed || [];
        recentSearches = user.personalization.recentSearches || [];
    }

    const quickCategories = getCategoryShortcuts(persona, greetingInfo.period);

    // 1. Fetch Buy Again items if user is logged in
    let buyAgain = [];
    if (user) {
        try {
            const pastOrders = await Order.find({ customerId: user._id })
                .sort({ _id: -1 })
                .limit(10)
                .lean();

            const itemFrequencyMap = new Map();
            const now = Date.now();

            for (const order of pastOrders) {
                const orderDate = order._id.getTimestamp ? order._id.getTimestamp() : new Date();
                const daysAgo = Math.max(1, Math.round((now - new Date(orderDate).getTime()) / (1000 * 60 * 60 * 24)));

                if (Array.isArray(order.items)) {
                    for (const item of order.items) {
                        if (item.itemId) {
                            const key = String(item.itemId);
                            if (!itemFrequencyMap.has(key)) {
                                itemFrequencyMap.set(key, {
                                    itemId: item.itemId,
                                    name: item.name,
                                    price: item.price,
                                    lastDaysAgo: daysAgo,
                                    orderCount: 1,
                                    shopId: order.shopId
                                });
                            } else {
                                const curr = itemFrequencyMap.get(key);
                                curr.orderCount += 1;
                            }
                        }
                    }
                }
            }

            if (itemFrequencyMap.size > 0) {
                const itemIds = Array.from(itemFrequencyMap.keys());
                const liveItems = await Item.find({ _id: { $in: itemIds }, isActive: true })
                    .populate('shop', 'shopName location isVerified')
                    .lean();

                const liveItemMap = new Map(liveItems.map(i => [String(i._id), i]));

                buyAgain = Array.from(itemFrequencyMap.values())
                    .filter(entry => liveItemMap.has(String(entry.itemId)))
                    .map(entry => {
                        const live = liveItemMap.get(String(entry.itemId));
                        return {
                            _id: live._id,
                            name: live.name || entry.name,
                            price: live.price,
                            actualPrice: live.actualPrice || live.price,
                            discount: live.discount || 0,
                            img: live.img,
                            image: live.img ? live.img.url : null,
                            itemCategory: live.itemCategory || 'Grocery',
                            shopName: live.shop ? live.shop.shopName : '',
                            shopId: live.shop ? live.shop._id : entry.shopId,
                            lastDaysAgo: entry.lastDaysAgo,
                            orderCount: entry.orderCount,
                            inStock: live.quantity > 0
                        };
                    })
                    .slice(0, 10);
            }
        } catch (err) {
            console.error("Error fetching buy again items:", err);
        }
    }

    // 2. Fetch Smart Recommendations based on Last Purchase
    let lastPurchaseRecommendations = null;
    if (user) {
        lastPurchaseRecommendations = await getLastPurchaseRecommendations(user._id, bazaar);
    }

    // 3. Fetch Active Bazaar / Nearby Shops
    let shopQuery = { isVerified: true };
    if (bazaar && bazaar !== 'All Bazaars' && bazaar !== 'undefined') {
        shopQuery.$or = [
            { bazaar: bazaar },
            { location: new RegExp(bazaar, 'i') }
        ];
    }
    const nearbyShops = await Shop.find(shopQuery)
        .select('shopName category location shopImage isVerified openingTime closingTime')
        .limit(8)
        .lean();

    res.json({
        success: true,
        greeting: greetingInfo,
        persona,
        quickCategories,
        buyAgain,
        lastPurchaseRecommendations,
        recentlyViewed: recentlyViewed.slice(0, 8),
        recentSearches: recentSearches.slice(0, 10),
        nearbyShops
    });
}));

/**
 * Helper: Smart recommendations based on user's last purchase / recent orders
 */
async function getLastPurchaseRecommendations(userId, currentBazaar = null) {
    if (!userId) return null;

    try {
        // Fetch up to 3 recent orders to find latest purchased items
        const recentOrders = await Order.find({ customerId: userId })
            .sort({ createdAt: -1, _id: -1 })
            .limit(3)
            .lean();

        if (!recentOrders || recentOrders.length === 0) {
            return null;
        }

        const lastOrder = recentOrders[0];
        if (!lastOrder.items || lastOrder.items.length === 0) {
            return null;
        }

        // Collect all previously purchased item IDs and names from recent orders
        const purchasedItemIds = [];
        const purchasedNames = [];
        for (const order of recentOrders) {
            if (Array.isArray(order.items)) {
                for (const item of order.items) {
                    if (item.itemId) purchasedItemIds.push(String(item.itemId));
                    if (item.name) purchasedNames.push(item.name.toLowerCase());
                }
            }
        }

        const lastItem = lastOrder.items[0];
        const lastItemName = lastItem && lastItem.name ? lastItem.name : "your previous items";
        const lastShopId = lastOrder.shopId;

        // Fetch details of items from the last order to identify categories
        const lastOrderedItemsDetails = await Item.find({
            _id: { $in: lastOrder.items.map(i => i.itemId).filter(Boolean) }
        }).lean();

        const purchasedCategories = new Set();
        for (const item of lastOrderedItemsDetails) {
            if (item.itemCategory) {
                purchasedCategories.add(item.itemCategory);
            }
        }

        // Identify complementary categories & keywords based on common purchase patterns
        const complementaryKeywords = [];
        const complementaryCategories = [];

        const combinedText = (purchasedNames.join(' ') + ' ' + Array.from(purchasedCategories).join(' ')).toLowerCase();

        if (combinedText.includes('milk') || combinedText.includes('dairy') || combinedText.includes('paneer') || combinedText.includes('curd') || combinedText.includes('dahi')) {
            complementaryKeywords.push('bread', 'butter', 'egg', 'tea', 'chai', 'rusk', 'biscuit', 'cheese', 'sugar', 'toast', 'poha');
            complementaryCategories.push('Bakery', 'Breakfast', 'Dairy', 'Snacks', 'Beverages');
        }
        if (combinedText.includes('atta') || combinedText.includes('flour') || combinedText.includes('rice') || combinedText.includes('dal') || combinedText.includes('oil') || combinedText.includes('grain')) {
            complementaryKeywords.push('masala', 'spice', 'oil', 'ghee', 'salt', 'sugar', 'haldi', 'mirch', 'jeera', 'mustard', 'sauce');
            complementaryCategories.push('Spices', 'Staples', 'Grocery', 'Cooking Essentials', 'Edible Oils');
        }
        if (combinedText.includes('tea') || combinedText.includes('chai') || combinedText.includes('coffee')) {
            complementaryKeywords.push('sugar', 'milk', 'biscuit', 'cookie', 'rusk', 'namkeen', 'snack');
            complementaryCategories.push('Biscuits & Cookies', 'Snacks', 'Dairy');
        }
        if (combinedText.includes('biscuit') || combinedText.includes('snack') || combinedText.includes('namkeen') || combinedText.includes('chips') || combinedText.includes('kurkure')) {
            complementaryKeywords.push('cold drink', 'juice', 'sauce', 'dip', 'beverage', 'tea', 'chocolate', 'sweets');
            complementaryCategories.push('Beverages', 'Cold Drinks & Juices', 'Chocolates & Sweets');
        }
        if (combinedText.includes('sabzi') || combinedText.includes('vegetable') || combinedText.includes('fruit') || combinedText.includes('potato') || combinedText.includes('onion')) {
            complementaryKeywords.push('onion', 'potato', 'tomato', 'ginger', 'garlic', 'chilli', 'lemon', 'oil', 'masala', 'coriander');
            complementaryCategories.push('Vegetables & Fruits', 'Spices');
        }
        if (combinedText.includes('soap') || combinedText.includes('shampoo') || combinedText.includes('toothpaste') || combinedText.includes('wash') || combinedText.includes('detergent')) {
            complementaryKeywords.push('detergent', 'dishwash', 'cleaner', 'brush', 'oil', 'cream', 'face wash', 'shampoo');
            complementaryCategories.push('Personal Care', 'Household & Cleaning');
        }

        // If no specific complementary mapping matched, fallback to related items from the same category
        if (complementaryKeywords.length === 0 && purchasedCategories.size > 0) {
            complementaryCategories.push(...Array.from(purchasedCategories));
        }

        // Base query for active, in-stock items not already purchased in that order
        const baseQuery = {
            _id: { $nin: purchasedItemIds },
            isActive: true,
            quantity: { $gt: 0 }
        };

        let recommendedItems = [];

        // 1. Try shop-specific items first (so user can order together easily)
        if (lastShopId) {
            const shopItems = await Item.find({
                ...baseQuery,
                shop: lastShopId
            })
            .populate('shop', 'shopName location isVerified')
            .limit(10)
            .lean();

            recommendedItems.push(...shopItems);
        }

        // 2. Also query items matching category / keywords across active bazaar
        const categoryRegexes = complementaryCategories.map(cat => new RegExp(cat, 'i'));
        const keywordRegexes = complementaryKeywords.map(kw => new RegExp(kw, 'i'));

        const orConditions = [];
        if (categoryRegexes.length > 0) {
            orConditions.push({ itemCategory: { $in: categoryRegexes } });
        }
        if (keywordRegexes.length > 0) {
            orConditions.push({ name: { $in: keywordRegexes } });
        }

        if (orConditions.length > 0) {
            const crossShopItems = await Item.find({
                ...baseQuery,
                $or: orConditions
            })
            .populate('shop', 'shopName location isVerified')
            .limit(15)
            .lean();

            const existingIds = new Set(recommendedItems.map(i => String(i._id)));
            for (const item of crossShopItems) {
                if (!existingIds.has(String(item._id))) {
                    recommendedItems.push(item);
                    existingIds.add(String(item._id));
                }
            }
        }

        // 3. Fallback filler if needed
        if (recommendedItems.length < 4) {
            const fillerItems = await Item.find({
                ...baseQuery,
                _id: { $nin: Array.from(new Set([...purchasedItemIds, ...recommendedItems.map(i => String(i._id))])) }
            })
            .populate('shop', 'shopName location isVerified')
            .limit(8)
            .lean();

            recommendedItems.push(...fillerItems);
        }

        // Format items
        const formattedItems = recommendedItems.slice(0, 10).map(item => ({
            _id: item._id,
            name: item.name,
            price: item.price,
            actualPrice: item.actualPrice || item.price,
            discount: item.discount || 0,
            img: item.img,
            image: item.img ? item.img.url : null,
            itemCategory: item.itemCategory || 'Grocery',
            shopName: item.shop ? item.shop.shopName : '',
            shopId: item.shop ? item.shop._id : null,
            inStock: item.quantity > 0,
            unit: item.sizes && item.sizes.length > 0 ? item.sizes[0] : null
        }));

        if (formattedItems.length === 0) return null;

        let subtitle = `Items frequently paired with ${lastItemName}`;
        if (lastOrderedItemsDetails.length > 0 && lastOrderedItemsDetails[0].itemCategory) {
            subtitle = `Pairs well with your ${lastOrderedItemsDetails[0].itemCategory} order`;
        }

        return {
            hasLastPurchase: true,
            lastItemName: lastItemName,
            title: "Recommended from your last purchase",
            subtitle: subtitle,
            badge: "Smart Recommendation",
            items: formattedItems
        };
    } catch (err) {
        console.error("Error computing last purchase recommendations:", err);
        return null;
    }
}

/**
 * GET /api/personalization/last-purchase-recommendations
 * Direct endpoint to fetch recommendations derived from user's last order
 */
router.get("/last-purchase-recommendations", catchAsync(async (req, res) => {
    if (!req.user) {
        return res.json({ success: true, recommendations: null });
    }

    const { bazaar } = req.query;
    const recommendations = await getLastPurchaseRecommendations(req.user._id, bazaar);

    res.json({
        success: true,
        recommendations
    });
}));

/**
 * GET /api/personalization/buy-again
 * Dedicated endpoint for 1-tap reorders
 */
router.get("/buy-again", catchAsync(async (req, res) => {
    if (!req.user) {
        return res.json({ success: true, items: [] });
    }

    const pastOrders = await Order.find({ customerId: req.user._id })
        .sort({ _id: -1 })
        .limit(15)
        .lean();

    const itemMap = new Map();
    const now = Date.now();

    for (const order of pastOrders) {
        const orderDate = order._id.getTimestamp ? order._id.getTimestamp() : new Date();
        const daysAgo = Math.max(1, Math.round((now - new Date(orderDate).getTime()) / (1000 * 60 * 60 * 24)));

        if (Array.isArray(order.items)) {
            for (const item of order.items) {
                if (item.itemId) {
                    const key = String(item.itemId);
                    if (!itemMap.has(key)) {
                        itemMap.set(key, {
                            itemId: item.itemId,
                            name: item.name,
                            price: item.price,
                            lastDaysAgo: daysAgo,
                            orderCount: 1,
                            shopId: order.shopId
                        });
                    } else {
                        itemMap.get(key).orderCount += 1;
                    }
                }
            }
        }
    }

    if (itemMap.size === 0) {
        return res.json({ success: true, items: [] });
    }

    const itemIds = Array.from(itemMap.keys());
    const liveItems = await Item.find({ _id: { $in: itemIds }, isActive: true })
        .populate('shop', 'shopName location')
        .lean();

    const liveItemMap = new Map(liveItems.map(i => [String(i._id), i]));

    const buyAgainItems = Array.from(itemMap.values())
        .filter(entry => liveItemMap.has(String(entry.itemId)))
        .map(entry => {
            const live = liveItemMap.get(String(entry.itemId));
            return {
                _id: live._id,
                name: live.name || entry.name,
                price: live.price,
                actualPrice: live.actualPrice || live.price,
                discount: live.discount || 0,
                img: live.img,
                image: live.img ? live.img.url : null,
                itemCategory: live.itemCategory || 'Grocery',
                shopName: live.shop ? live.shop.shopName : '',
                shopId: live.shop ? live.shop._id : entry.shopId,
                lastDaysAgo: entry.lastDaysAgo,
                orderCount: entry.orderCount,
                inStock: live.quantity > 0
            };
        });

    res.json({
        success: true,
        items: buyAgainItems
    });
}));

/**
 * POST /api/personalization/track-activity
 * Asynchronously record client search, view, and category engagement
 */
router.post("/track-activity", catchAsync(async (req, res) => {
    if (!req.user) {
        return res.json({ success: true, message: "Guest session acknowledged" });
    }

    const { eventType, item, query, category } = req.body;
    const user = await Customer.findById(req.user._id);

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.personalization) {
        user.personalization = {
            persona: 'GENERAL',
            categoryAffinities: new Map(),
            recentSearches: [],
            recentlyViewed: []
        };
    }

    // Ensure categoryAffinities is a Map
    if (!(user.personalization.categoryAffinities instanceof Map)) {
        user.personalization.categoryAffinities = new Map(Object.entries(user.personalization.categoryAffinities || {}));
    }

    if (eventType === 'view' && item) {
        const existingIdx = user.personalization.recentlyViewed.findIndex(
            v => String(v.itemId) === String(item.id || item._id)
        );
        if (existingIdx !== -1) {
            user.personalization.recentlyViewed.splice(existingIdx, 1);
        }

        user.personalization.recentlyViewed.unshift({
            itemType: item.type || 'product',
            itemId: item.id || item._id,
            title: item.title || item.name || '',
            price: Number(item.price) || 0,
            image: item.image || (item.img ? item.img.url : '') || '',
            category: item.category || item.itemCategory || '',
            timestamp: new Date()
        });

        // Limit to 20
        if (user.personalization.recentlyViewed.length > 20) {
            user.personalization.recentlyViewed = user.personalization.recentlyViewed.slice(0, 20);
        }

        if (item.category || item.itemCategory) {
            const cat = item.category || item.itemCategory;
            const currentCount = user.personalization.categoryAffinities.get(cat) || 0;
            user.personalization.categoryAffinities.set(cat, currentCount + 1);
        }
    } else if (eventType === 'search' && query) {
        const trimmed = String(query).trim();
        if (trimmed) {
            const existingIdx = user.personalization.recentSearches.findIndex(
                s => s.query.toLowerCase() === trimmed.toLowerCase()
            );
            if (existingIdx !== -1) {
                user.personalization.recentSearches.splice(existingIdx, 1);
            }

            user.personalization.recentSearches.unshift({
                query: trimmed,
                category: category || '',
                timestamp: new Date()
            });

            if (user.personalization.recentSearches.length > 15) {
                user.personalization.recentSearches = user.personalization.recentSearches.slice(0, 15);
            }
        }
    } else if (eventType === 'category_click' && category) {
        const currentCount = user.personalization.categoryAffinities.get(category) || 0;
        user.personalization.categoryAffinities.set(category, currentCount + 2);
    }

    // Recompute persona
    user.personalization.persona = calculatePersona(user.personalization.categoryAffinities);
    user.markModified('personalization');
    await user.save();

    res.json({
        success: true,
        persona: user.personalization.persona
    });
}));

module.exports = router;

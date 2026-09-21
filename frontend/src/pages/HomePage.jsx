import React, { useState, useEffect, useMemo, useRef } from 'react';
import OffersSection from '../components/home/OffersSection';
import { getRecentlyViewed, saveViewedService } from '../utils/tracking';

const COLORS = {
    PRIMARY: '#1E3A8A',     // Deep Navy Blue (Brand)
    PRIMARY_LIGHT: '#EFF6FF',
    ACCENT: '#F97316',      // Orange
    SUCCESS: '#16A34A',     // Green
    SUCCESS_LIGHT: '#DCFCE7',
    TEXT_MAIN: '#0F172A',   // Slate 900
    TEXT_MUTED: '#64748B',  // Slate 500
    BORDER: '#E2E8F0',      // Slate 200
    BG: '#F8FAFC',          // Light App Background
    CARD_BG: '#FFFFFF'
};

const CATEGORIES = [
    { name: 'For You', emoji: '🌟', icon: 'fa-star' },
    { name: 'Food', emoji: '🍽️', icon: 'fa-utensils' },
    { name: 'Grocery', emoji: '🛒', icon: 'fa-basket-shopping' },
    { name: 'Vegetables & Fruits', emoji: '🥦', icon: 'fa-leaf' },
    { name: 'General Store', emoji: '🏪', icon: 'fa-store' },
    { name: 'Fashion', emoji: '👕', icon: 'fa-shirt' },
    { name: 'Footwear', emoji: '👟', icon: 'fa-shoe-prints' },
    { name: 'Jewelers', emoji: '💍', icon: 'fa-gem' },
    { name: 'Beauty/Cosmetics', emoji: '💄', icon: 'fa-wand-magic-sparkles' },
    { name: 'Electronics', emoji: '🔌', icon: 'fa-plug' },
    { name: 'Mobile Shop', emoji: '📱', icon: 'fa-mobile-screen' },
    { name: 'Medical', emoji: '💊', icon: 'fa-pills' },
    { name: 'Seeds & Fertilizers', emoji: '🌱', icon: 'fa-seedling' },
    { name: 'Hardware', emoji: '🔨', icon: 'fa-hammer' },
    { name: 'Automobile', emoji: '🚗', icon: 'fa-car' },
    { name: 'Furniture', emoji: '🪑', icon: 'fa-couch' },
    { name: 'Sports', emoji: '🏏', icon: 'fa-baseball-bat-ball' },
    { name: 'Stationery', emoji: '📚', icon: 'fa-book' },
    { name: 'Printing & Digital', emoji: '🖨️', icon: 'fa-print' },
    { name: 'Salon', emoji: '💇', icon: 'fa-scissors' },
    { name: 'Coaching', emoji: '👨‍🏫', icon: 'fa-graduation-cap' },
];

const CATEGORY_GROUPING = {
    'For You': [],
    'Food': ['Food', 'Restaurant', 'Dhaba', 'Bakery', 'Sweet Shop', 'Cafe', 'Fast Food', 'Non-Veg', 'Dining'],
    'Grocery': ['Grocery', 'Kirana', 'Supermarket', 'Daily Needs'],
    'Vegetables & Fruits': ['Vegetables & Fruits', 'Vegetables', 'Fruits', 'Fresh', 'Sabzi', 'Kisan'],
    'General Store': ['General Store', 'Store', 'Provisions'],
    'Fashion': ['Fashion', 'Clothes', 'Clothing', 'Garments', 'Men', 'Women', 'Kids', 'Wear', 'Saree', 'Sari', 'Kurti', 'Jeans', 'Shirt', 'Pant', 'T-Shirt', 'Suit', 'Lehenga', 'Lungi', 'Textile', 'Vastralay'],
    'Footwear': ['Footwear', 'Shoes', 'Slippers', 'Sandals', 'Sandal', 'Slipper', 'Sneakers', 'Mojari', 'Jutti', 'Crocs', 'Chappal'],
    'Jewelers': ['Jewelers', 'Jewelry', 'Gold', 'Silver', 'Diamond', 'Jewellery', 'Bartan'],
    'Beauty/Cosmetics': ['Beauty/Cosmetics', 'Cosmetics', 'Beauty', 'Makeup', 'Skincare', 'Sringar', 'Shringar', 'Singaar', 'Alta', 'Kajal', 'Lipstick'],
    'Electronics': ['Electronics', 'Electrical', 'Appliance', 'Electric', 'Fan', 'Inverter', 'Cable', 'Adapter', 'Bulb', 'Light'],
    'Mobile Shop': ['Mobile Shop', 'Mobile', 'Smartphone', 'Phone', 'Cover', 'Earphone', 'Headset', 'Buds', 'Charger'],
    'Medical': ['Medical', 'Pharmacy', 'Chemist', 'Medicine', 'Health', 'Healthcare', 'Ayurvedic', 'Aushadhalay', 'First Aid', 'Syrup', 'Tablet'],
    'Seeds & Fertilizers': ['Seeds & Fertilizers', 'Seeds', 'Fertilizers', 'Agriculture', 'Kisan Sabha', 'Farming', 'Pesticides', 'Cocopit', 'Cultivator', 'Seed'],
    'Hardware': ['Hardware', 'Sanitary', 'Paints', 'Tools', 'Building Materials', 'Plumbing', 'Locks', 'Bathware', 'Tape', 'Mixer'],
    'Automobile': ['Automobile', 'Auto', 'Auto Parts', 'Motor', 'Motor Parts', 'Cycle', 'Cycle Workshop', 'Bike', 'Bike Repair', 'Bike Service', 'Garage', 'Workshop', 'Lubricant', 'Lube', 'Car', 'Car Care', 'Tyre', 'Tire', 'Parts & Accessories', 'Oils & Lubricants', 'Silayi Machine', 'Vehicle', 'Mobil', 'Castrol', 'Engine Oil'],
    'Furniture': ['Furniture', 'Wood', 'Home Decor', 'Beds & Mattresses', 'Sofas & Chairs', 'Tables', 'Bed', 'Almirah', 'Dining', 'Chair', 'Table'],
    'Sports': ['Sports', 'Gym', 'Fitness', 'Cricket', 'Football', 'Badminton', 'Jersey', 'Bat', 'Ball'],
    'Stationery': ['Stationery', 'Books', 'Copies', 'School', 'Pen', 'Notebook', 'Paper', 'Copy', 'Book'],
    'Printing & Digital': ['Printing & Digital', 'Printing', 'Flex', 'Studio', 'Digital Studio', 'Photo Frame', 'Photocopy'],
    'Salon': ['Salon', 'Hair Cut', 'Parlour', 'Barber', 'Beauty Parlour'],
    'Coaching': ['Coaching', 'Tuition', 'Classes', 'Institute'],
};

const CATEGORY_SUB_CATEGORIES = {
    'Food': [
        { name: 'All', icon: '🍽️' },
        { name: 'South Indian', icon: '🥘' },
        { name: 'Fast Food', icon: '🍔' },
        { name: 'Chinese', icon: '🥡' },
        { name: 'Biryani & Rice', icon: '🍚' },
        { name: 'Sweets & Bakery', icon: '🍰' },
        { name: 'Dhaba & Thali', icon: '🍱' },
        { name: 'Veg Dishes', icon: '🥗' },
        { name: 'Non-Veg', icon: '🍗' },
        { name: 'Beverages & Shakes', icon: '🥤' },
        { name: 'Chowmein & Rolls', icon: '🌯' }
    ],
    'Grocery': [
        { name: 'All', icon: '🛒' },
        { name: 'Staples & Grains', icon: '🌾' },
        { name: 'Edible Oil & Ghee', icon: '🛢️' },
        { name: 'Spices & Masala', icon: '🌶️' },
        { name: 'Dairy & Milk', icon: '🥛' },
        { name: 'Snacks & Namkeen', icon: '🥨' },
        { name: 'Beverages', icon: '🥤' },
        { name: 'Personal Care', icon: '🧴' },
        { name: 'Cleaning Supplies', icon: '🧹' },
        { name: 'Dry Fruits', icon: '🥜' },
        { name: 'Instant Food', icon: '🍜' }
    ],
    'Vegetables & Fruits': [
        { name: 'All', icon: '🥦' },
        { name: 'Fresh Fruits', icon: '🍎' },
        { name: 'Fresh Vegetables', icon: '🥬' },
        { name: 'Seasonal Items', icon: '🌽' },
        { name: 'Organic & Herbs', icon: '🌿' }
    ],
    'Fashion': [
        { name: 'All', icon: '👕' },
        { name: "Men's Wear", icon: '👔' },
        { name: "Women's Wear", icon: '👗' },
        { name: 'Sarees & Kurtis', icon: '🥻' },
        { name: 'Kids Clothing', icon: '👶' },
        { name: 'Jeans & Trousers', icon: '👖' },
        { name: 'T-Shirts & Shirts', icon: '👕' },
        { name: 'Winter Wear', icon: '🧥' }
    ],
    'Footwear': [
        { name: 'All', icon: '👟' },
        { name: 'Sports Shoes', icon: '👟' },
        { name: 'Casual & Sneakers', icon: '👞' },
        { name: 'Formal Shoes', icon: '👞' },
        { name: 'Sandals & Slippers', icon: '🩴' },
        { name: 'Women Footwear', icon: '👠' },
        { name: 'Kids Footwear', icon: '👟' }
    ],
    'Automobile': [
        { name: 'All', icon: '🚗' },
        { name: 'Parts & Accessories', icon: '🔧' },
        { name: 'Oils & Lubricants', icon: '🛢️' },
        { name: 'Bike Service & Repair', icon: '🛵' },
        { name: 'Cycle & Workshop', icon: '🚲' },
        { name: 'Car Care & Wash', icon: '✨' },
        { name: 'Tyres & Tubes', icon: '⚙️' }
    ],
    'Electronics': [
        { name: 'All', icon: '🔌' },
        { name: 'Wiring & Cables', icon: '🔌' },
        { name: 'Lighting & Bulbs', icon: '💡' },
        { name: 'Switches & Sockets', icon: '🎚️' },
        { name: 'Fans & Coolers', icon: '💨' },
        { name: 'TV & Appliances', icon: '📺' },
        { name: 'Inverters & Batteries', icon: '🔋' }
    ],
    'Mobile Shop': [
        { name: 'All', icon: '📱' },
        { name: 'Smartphones', icon: '📱' },
        { name: 'Covers & Cases', icon: '📲' },
        { name: 'Chargers & Cables', icon: '🔌' },
        { name: 'Earphones & Audio', icon: '🎧' },
        { name: 'Screen Protectors', icon: '🛡️' }
    ],
    'Medical': [
        { name: 'All', icon: '💊' },
        { name: 'Medicines', icon: '💊' },
        { name: 'Ayurvedic', icon: '🌿' },
        { name: 'Health Supplements', icon: '💪' },
        { name: 'Medical Devices', icon: '🩺' },
        { name: 'First Aid & Bandages', icon: '🩹' }
    ],
    'Hardware': [
        { name: 'All', icon: '🔨' },
        { name: 'Tools & Equipment', icon: '🔨' },
        { name: 'Building Materials', icon: '🧱' },
        { name: 'Paint & Supplies', icon: '🎨' },
        { name: 'Plumbing & Pipes', icon: '🚰' },
        { name: 'Locks & Security', icon: '🔒' }
    ],
    'Seeds & Fertilizers': [
        { name: 'All', icon: '🌱' },
        { name: 'Seeds', icon: '🌱' },
        { name: 'Chemical Fertilizers', icon: '🧪' },
        { name: 'Organic Fertilizers', icon: '♻️' },
        { name: 'Pesticides', icon: '🦟' },
        { name: 'Farming Tools', icon: '🚜' }
    ]
};

// Domain level guard matching Flutter category grouping
function itemBelongsToMainCategory(item, mainCat) {
    if (!mainCat || mainCat === 'For You' || mainCat === 'All' || mainCat === 'All Products') return true;
    
    const keywords = (CATEGORY_GROUPING[mainCat] || [mainCat]).map(k => k.toLowerCase());
    
    const shopCat = ((item.shop?.category || item.shopCategory) || '').toString().trim().toLowerCase();
    const shopName = ((item.shop?.shopName || item.shopName) || '').toString().trim().toLowerCase();
    const itemCat = ((item.itemCategory || item.category) || '').toString().trim().toLowerCase();
    const parentCat = (item.parentCategory || '').toString().trim().toLowerCase();
    const itemName = ((item.name || item.productName) || '').toString().trim().toLowerCase();

    // 1. Direct Parent Category match
    if (parentCat && (parentCat === mainCat.toLowerCase() || keywords.includes(parentCat))) return true;

    // 2. Direct Shop Category exact or grouped match (Highest Confidence)
    if (shopCat) {
        const matchesShopCat = keywords.some(kw => shopCat === kw || shopCat.startsWith(kw) || kw.startsWith(shopCat));
        if (matchesShopCat) return true;
    }

    // 3. Item Category exact or grouped match
    if (itemCat) {
        const matchesItemCat = keywords.some(kw => itemCat === kw || itemCat.startsWith(kw) || kw.startsWith(itemCat));
        if (matchesItemCat) return true;
    }

    // 4. Shop Name match
    if (shopName) {
        const matchesShopName = keywords.some(kw => kw.length >= 4 && shopName.includes(kw));
        if (matchesShopName) return true;
    }

    // 5. Item Name match
    if (itemName) {
        const matchesItemName = keywords.some(kw => kw.length >= 4 && itemName.includes(kw));
        if (matchesItemName) return true;
    }

    return false;
}

// Subcategory matcher with strict Veg vs Non-Veg separation
function itemMatchesSubCategory(item, subCat) {
    if (!subCat || subCat === 'All') return true;
    const subCatLower = subCat.toLowerCase().trim();

    const name = (item.productName || item.name || '').toLowerCase();
    const itemCat = (item.category || item.itemCategory || '').toLowerCase().trim();
    const shopName = (item.shopName || (item.shop && item.shop.shopName) || '').toLowerCase();
    const shopCat = (item.shopCategory || (item.shop && item.shop.category) || '').toLowerCase();
    const combined = `${name} ${itemCat} ${shopName} ${shopCat}`;

    const isNonVegItem = /\b(chicken|mutton|fish|egg|meat|non-veg|nonveg|non\s*veg|prawn|prawns|crab|pork|beef|keema|kheema|boti|gosht|tangdi|kalmi|murgh|lolipop|lollipop)\b/i.test(name) ||
        /\b(chicken|mutton|fish|egg|meat|non-veg|nonveg|non\s*veg|prawn|prawns|crab|pork|beef|keema|kheema|boti|gosht|tangdi|kalmi|murgh)\b/i.test(itemCat);

    // 1. Veg Dishes filter (Absolute non-veg exclusion)
    if (subCatLower.includes('veg dishes') || subCatLower === 'veg' || subCatLower === 'vegetarian') {
        if (isNonVegItem) return false;
        if (itemCat === 'veg dishes' || itemCat === 'veg' || itemCat === 'vegetarian') return true;
        return /\b(veg|paneer|dal|mushroom|kofta|mix\s*veg|aloo|gobhi|chole|sabji|sabzi|curry|roti|naan|kulcha|kulchaa|paratha|bhature|rice|pulao|jeera\s*rice|thali)\b/i.test(combined);
    }

    // 2. Non-Veg filter
    if (subCatLower.includes('non-veg') || subCatLower.includes('chicken') || subCatLower.includes('mutton')) {
        if (!isNonVegItem && itemCat !== 'non-veg dishes' && itemCat !== 'non-veg' && itemCat !== 'chicken' && itemCat !== 'mutton' && itemCat !== 'fish' && itemCat !== 'egg') {
            return false;
        }
        return true;
    }

    // 3. Exact Category match
    if (itemCat && itemCat === subCatLower) {
        return true;
    }

    // 4. Keyword & Regional spelling match
    if (subCatLower.includes('south indian')) {
        return /\b(south\s*indian|dosa|dosha|dhosa|idli|edlli|edli|idly|vada|wada|sambhar|sambar|uttapam|uthappam|upma|appam|rasam|chutney)\b/i.test(combined);
    }
    if (subCatLower.includes('fast food') || subCatLower.includes('chowmein & rolls')) {
        return /\b(fast\s*food|burger|burgers|pizza|pizzas|chowmein|chow\s*mein|chawmin|chawming|roll|rolls|sandwich|sandwiches|momo|momos|fries|french\s*fries|pasta|patty|patties|noodles|noodle|chilli|manchurian|egg\s*roll|paneer\s*roll|spring\s*roll|chaat|samosa|kachori|pav\s*bhaji)\b/i.test(combined);
    }
    if (subCatLower.includes('chinese')) {
        return /\b(chinese|chowmein|chow\s*mein|chawmin|chawming|noodles|noodle|manchurian|fried\s*rice|momo|momos|chilli\s*chicken|chilli\s*paneer|spring\s*roll|soup|schezwan|hakka)\b/i.test(combined);
    }
    if (subCatLower.includes('biryani & rice') || subCatLower === 'rice') {
        return /\b(biryani|dum\s*biryani|hyderabadi|chicken\s*biryani|mutton\s*biryani|veg\s*biryani|pulao|fried\s*rice|jeera\s*rice|khichdi|rice)\b/i.test(combined);
    }
    if (subCatLower.includes('sweets & bakery') || subCatLower.includes('sweet') || subCatLower.includes('bakery')) {
        return /\b(sweet|sweets|mithai|cake|cakes|pastry|pastries|rasgulla|gulab\s*jamun|peda|laddu|ladoo|jalebi|bread|biscuit|biscuits|cookie|cookies|barfi|kaju\s*katli|rasmalai|muffin)\b/i.test(combined);
    }
    if (subCatLower.includes('dhaba & thali') || subCatLower.includes('thali') || subCatLower.includes('dhaba')) {
        return /\b(thali|veg\s*thali|special\s*thali|roti|naan|butter\s*naan|tandoori\s*roti|paneer|dal|tadka|dal\s*makhani|curry|sabji|sabzi|chole|bhature|kulcha|combo|meal|dhaba)\b/i.test(combined);
    }
    if (subCatLower.includes('beverages')) {
        return /\b(beverage|beverages|drink|drinks|juice|shake|shakes|tea|chai|coffee|lassi|cold\s*drink|coke|pepsi|sprite|frooti|maaza|water|soda|mocktail)\b/i.test(combined);
    }

    // Grocery
    if (subCatLower.includes('staples') || subCatLower.includes('grains')) {
        return /\b(staple|staples|grain|grains|atta|flour|maida|suji|besan|chawal|rice|basmati|dal|daal|pulses|arhar|moong|chana|urad|rajma|chhole|sugar|cheeni|salt|namak|poha)\b/i.test(combined);
    }
    if (subCatLower.includes('edible oil') || subCatLower.includes('ghee')) {
        return /\b(edible\s*oil|mustard\s*oil|refined\s*oil|sarson|fortune|safola|dhara|ghee|desi\s*ghee|amul\s*ghee|sunflower\s*oil|soyabean\s*oil|cooking\s*oil)\b/i.test(combined);
    }
    if (subCatLower.includes('spices') || subCatLower.includes('masala')) {
        return /\b(spice|spices|masala|haldi|turmeric|mirch|chilli\s*powder|dhaniya|coriander|jeera|cumin|garam\s*masala|hing|rai|methi|sabji\s*masala|chicken\s*masala|paneer\s*masala|elaichi|laung)\b/i.test(combined);
    }
    if (subCatLower.includes('dairy') || subCatLower.includes('milk')) {
        return /\b(dairy|milk|doodh|curd|dahi|paneer|butter|makhan|amul|sudha|cheese|lassi|cream|malai)\b/i.test(combined);
    }
    if (subCatLower.includes('snacks & namkeen') || subCatLower.includes('namkeen')) {
        return /\b(snack|snacks|namkeen|bhujia|mixture|chips|lays|kurkure|biscuit|biscuits|cookie|cookies|rusk|toast|bhujiya|haldiram|bikaji|parle|britannia)\b/i.test(combined);
    }
    if (subCatLower.includes('dry fruits')) {
        return /\b(dry\s*fruit|dry\s*fruits|badam|almond|kaju|cashew|kishmish|raisin|pista|pelt|walnut|akhrot|anjeer|dates|khajur|makhana)\b/i.test(combined);
    }
    if (subCatLower.includes('cleaning')) {
        return /\b(cleaning|detergent|surf|wheel|tide|ariel|vim|dishwash|harpic|lizol|colin|phenyl|broom|mop|cleaner|soap|rin|dettol)\b/i.test(combined);
    }
    if (subCatLower.includes('personal care')) {
        return /\b(personal\s*care|shampoo|soap|toothpaste|colgate|pepsodent|brush|facewash|face\s*wash|cream|lotion|vaseline|hair\s*oil|bajaj|dabur|ponds)\b/i.test(combined);
    }
    if (subCatLower.includes('instant')) {
        return /\b(instant|maggi|noodle|noodles|pasta|yippee|oats|cornflakes|soup|knorr|ready\s*to\s*eat|chocos)\b/i.test(combined);
    }

    // Automobile
    if (subCatLower.includes('oils') || subCatLower.includes('lubricants')) {
        return /\b(oil|oils|lubricant|lubricants|engine\s*oil|mobil|castrol|motul|servo|gulf|hp\s*racer|2t|4t|brake\s*oil|gear\s*oil|coolant|grease|chain\s*lube)\b/i.test(combined);
    }
    if (subCatLower.includes('parts') || subCatLower.includes('accessories')) {
        return /\b(part|parts|accessory|accessories|clutch|brake|brake\s*shoe|filter|air\s*filter|oil\s*filter|spark\s*plug|plug|mirror|side\s*mirror|indicator|headlight|bulb|horn|lever|cable|chain|sprocket|bearing|wizer|panel)\b/i.test(combined);
    }
    if (subCatLower.includes('tires') || subCatLower.includes('tyres') || subCatLower.includes('wheels')) {
        return /\b(tire|tires|tyre|tyres|tube|tubes|wheel|wheels|rim|mrf|ceat|apollo|tvs|ralco|puncture)\b/i.test(combined);
    }

    // Fashion
    if (subCatLower.includes("men's wear") || subCatLower.includes("men")) {
        return /\b(men|shirt|shirts|t-shirt|tshirts|t-shirts|pant|pants|jeans|trouser|trousers|kurta|sherwani|formal|blazer|jacket|hoodie|track\s*pant|boxer|vest)\b/i.test(combined);
    }
    if (subCatLower.includes("women's wear") || subCatLower.includes("women")) {
        return /\b(women|woman|ladies|saree|sari|kurti|kurtis|kurta\s*set|dress|dresses|top|tops|legging|leggings|palazzo|suit|dupatta|gown|lehenga|bra|panty|nighty)\b/i.test(combined);
    }
    if (subCatLower.includes('sarees') || subCatLower.includes('kurtis')) {
        return /\b(saree|sari|kurti|kurtis|kurta\s*set|anarkali|silk\s*saree|cotton\s*saree|designer\s*saree)\b/i.test(combined);
    }
    if (subCatLower.includes('kids')) {
        return /\b(kid|kids|baby|boy|girl|children|frock|baba\s*suit|shorts|toddler)\b/i.test(combined);
    }

    // Footwear
    if (subCatLower.includes('sports shoes') || subCatLower.includes('sports')) {
        return /\b(sport|sports|running|gym|sneaker|sneakers|jogging|campus|sparx|asian|goldstar|adidas|nike|puma)\b/i.test(combined);
    }
    if (subCatLower.includes('casual') || subCatLower.includes('formal')) {
        return /\b(casual|formal|leather|derby|oxford|loafer|loafers|boot|boots|party\s*wear)\b/i.test(combined);
    }
    if (subCatLower.includes('sandals') || subCatLower.includes('slippers')) {
        return /\b(sandal|sandals|slipper|slippers|flip\s*flop|flipflops|chappal|hawai|slide|slides|crocs|bata|relaxo|flite|paragon)\b/i.test(combined);
    }
    if (subCatLower.includes('women footwear')) {
        return /\b(heel|heels|flat|flats|women\s*sandal|ladies\s*slipper|jutti|mojari|wedge|wedges|belly)\b/i.test(combined);
    }

    // Medical
    if (subCatLower.includes('medicines') || subCatLower.includes('syrups')) {
        return /\b(medicine|medicines|tablet|tablets|capsule|capsules|syrup|syrups|paracetamol|crocin|pain\s*killer|antibiotic|ointment|gel|drop|drops|injection)\b/i.test(combined);
    }
    if (subCatLower.includes('ayurvedic')) {
        return /\b(ayurvedic|ayurveda|patanjali|dabur|zandu|baidyanath|churna|churan|kadha|herb|herbal|neem|tulsi|ashwagandha|chyawanprash)\b/i.test(combined);
    }

    return false;
}

export default function HomePage({ isLoggedIn, initialLat, initialLon, initialBazaarName }) {
    const [selectedCategory, setSelectedCategory] = useState('For You');
    const [selectedSubCategory, setSelectedSubCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [shops, setShops] = useState([]);
    const [currentItems, setCurrentItems] = useState([]);
    const [discoveryData, setDiscoveryData] = useState(null);
    const [buyAgainItems, setBuyAgainItems] = useState([]);
    const [recentItems, setRecentItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showCoinsModal, setShowCoinsModal] = useState(false);
    const [showBazaarModal, setShowBazaarModal] = useState(false);
    const [bazaars, setBazaars] = useState([]);
    const [bazaarSearch, setBazaarSearch] = useState('');
    const [addingToCart, setAddingToCart] = useState({});
    const [isScrolled, setIsScrolled] = useState(false);

    const scrollContainerRef = useRef(null);

    // Track scroll position to collapse category bar to pills
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Initial Discovery & Personalization Fetch
    useEffect(() => {
        setRecentItems(getRecentlyViewed());

        const fetchDiscovery = async () => {
            try {
                const [discRes, personRes, bazaarRes] = await Promise.all([
                    fetch('/api/discovery').then(r => r.json()).catch(() => ({})),
                    fetch('/api/personalization/home').then(r => r.json()).catch(() => ({})),
                    fetch('/api/bazaars').then(r => r.json()).catch(() => ({}))
                ]);

                if (discRes.success && discRes.data) {
                    setDiscoveryData(discRes.data);
                    if (discRes.data.shops) setShops(discRes.data.shops);
                }
                if (personRes.success && personRes.buyAgain) {
                    setBuyAgainItems(personRes.buyAgain);
                }
                if (bazaarRes.success && bazaarRes.bazaars) {
                    setBazaars(bazaarRes.bazaars);
                }
            } catch (err) {
                console.error("Discovery error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDiscovery();
    }, []);

    // Fetch Category Items when Category Changes
    useEffect(() => {
        setPage(1);
        setSelectedSubCategory('All');
        setCurrentItems([]);
        fetchItems(1, false, selectedCategory);
    }, [selectedCategory]);

    const fetchItems = async (targetPage = 1, append = false, catToFetch = selectedCategory) => {
        if (targetPage > 1) setIsFetchingMore(true);
        else setIsLoading(true);

        try {
            const fetchLimit = catToFetch === 'For You' ? 100 : 20;
            let url = `/api/home/items?page=${targetPage}&limit=${fetchLimit}`;

            if (catToFetch !== 'For You') {
                const group = CATEGORY_GROUPING[catToFetch];
                if (group && group.length > 0) {
                    url += `&shopCategory=${encodeURIComponent(group.join(','))}`;
                } else {
                    url += `&shopCategory=${encodeURIComponent(catToFetch)}`;
                }
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data && data.items) {
                if (append) {
                    setCurrentItems(prev => [...prev, ...data.items]);
                } else {
                    setCurrentItems(data.items);
                }
                setHasMore(data.hasMore || (data.items.length >= fetchLimit));
            } else if (!append) {
                setCurrentItems([]);
            }
        } catch (err) {
            console.error("Failed to fetch category items:", err);
            if (!append) setCurrentItems([]);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    };

    // Quick Add to Cart
    const handleQuickAdd = async (e, item) => {
        e.stopPropagation();
        const itemId = item.id || item._id;
        if (!itemId) return;

        setAddingToCart(prev => ({ ...prev, [itemId]: true }));
        try {
            const res = await fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: itemId,
                    quantity: 1
                })
            });
            const data = await res.json();
            if (data.success) {
                // Flash feedback
                setAddingToCart(prev => ({ ...prev, [itemId]: 'added' }));
                setTimeout(() => {
                    setAddingToCart(prev => ({ ...prev, [itemId]: false }));
                }, 1200);
            } else {
                setAddingToCart(prev => ({ ...prev, [itemId]: false }));
            }
        } catch (e) {
            setAddingToCart(prev => ({ ...prev, [itemId]: false }));
        }
    };

    // Filter Shops for the selected category
    const filteredShops = useMemo(() => {
        if (!shops || shops.length === 0) return [];
        if (selectedCategory === 'For You') return shops.slice(0, 10);

        const subCats = CATEGORY_GROUPING[selectedCategory] || [selectedCategory];
        const subCatsLower = subCats.map(c => c.toLowerCase());

        return shops.filter(shop => {
            const shopCat = (shop.category || '').toLowerCase();
            const shopName = (shop.shopName || '').toLowerCase();
            return subCatsLower.some(c => shopCat.includes(c) || shopName.includes(c));
        });
    }, [shops, selectedCategory]);

    // Filtered Products for the active subcategory
    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'For You') return [];

        const categoryScoped = currentItems.filter(item => itemBelongsToMainCategory(item, selectedCategory));
        return categoryScoped.filter(item => itemMatchesSubCategory(item, selectedSubCategory));
    }, [currentItems, selectedCategory, selectedSubCategory]);

    // Time contextual items for For You
    const timeContextual = useMemo(() => {
        const hour = new Date().getHours();
        let title = 'Evening Cravings & Snacks';
        let subtitle = 'Biryani, rolls, pizzas & hot bites';
        let emoji = '🍕';

        if (hour >= 5 && hour < 12) {
            title = 'Morning Essentials & Fruits';
            subtitle = 'Fresh fruits, milk, curd & healthy breakfast';
            emoji = '🌅';
        } else if (hour >= 12 && hour < 17) {
            title = 'Afternoon Coolers & Quick Bites';
            subtitle = 'Cold drinks, ice creams & pastries';
            emoji = '🍧';
        }

        const items = currentItems.slice(0, 10);
        return { title, subtitle, emoji, items };
    }, [currentItems]);

    // Popular Picks for "For You"
    const forYouPicks = useMemo(() => {
        if (selectedCategory !== 'For You') return [];
        return currentItems.filter(item => (item.discount || 0) > 0 || item.deliveryCategory === 'quick').slice(0, 10);
    }, [currentItems, selectedCategory]);

    return (
        <div style={{ background: COLORS.BG, minHeight: '100vh', paddingBottom: '80px', fontFamily: "'Outfit', sans-serif" }}>
            
            {/* 1. Single Top Navigation Header Bar */}
            <header style={{
                background: COLORS.CARD_BG,
                padding: '10px 20px',
                borderBottom: `1px solid ${COLORS.BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                {/* Left: Local Bazaar Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <div 
                        onClick={() => setShowBazaarModal(true)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: COLORS.TEXT_MUTED, fontWeight: '600' }}>
                            <i className="fa-solid fa-location-dot" style={{ color: COLORS.PRIMARY }}></i>
                            <span>Local Bazaar</span>
                            <i className="fa-solid fa-chevron-down" style={{ fontSize: '9px', color: COLORS.TEXT_MUTED }}></i>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.PRIMARY, whiteSpace: 'nowrap' }}>
                            {initialBazaarName ? (initialBazaarName.toLowerCase().includes('bazaar') ? initialBazaarName : `${initialBazaarName} Bazaar`) : 'Select Bazaar'}
                        </div>
                    </div>
                </div>

                {/* Center: Search Bar in the Same Line */}
                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                    }}
                    style={{
                        flex: '1 1 320px',
                        maxWidth: '520px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#F8FAFC',
                        padding: '7px 14px',
                        borderRadius: '99px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                >
                    <i className="fa-solid fa-search" style={{ color: '#94A3B8', fontSize: '13px' }}></i>
                    <input 
                        type="text" 
                        placeholder={`Search in ${initialBazaarName || 'PASR'}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            width: '100%',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: COLORS.TEXT_MAIN
                        }}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '12px'
                            }}
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    )}
                </form>

                {/* Right: Coins, Notifications, Login */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* PASR Coins Button */}
                    <div 
                        onClick={() => setShowCoinsModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            padding: '6px 12px',
                            borderRadius: '99px',
                            fontSize: '12px',
                            fontWeight: '800',
                            color: '#92400E',
                            cursor: 'pointer'
                        }}
                    >
                        <i className="fa-solid fa-coins" style={{ color: '#D97706' }}></i>
                        <span>Coins</span>
                    </div>

                    {/* Notification Bell */}
                    <div 
                        onClick={() => window.location.href = '/notifications'}
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: COLORS.TEXT_MAIN
                        }}
                    >
                        <i className="fa-regular fa-bell"></i>
                    </div>

                    {!isLoggedIn && (
                        <button
                            onClick={() => window.location.href = '/login'}
                            style={{
                                background: COLORS.PRIMARY_LIGHT,
                                color: COLORS.PRIMARY,
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '99px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            Login
                        </button>
                    )}
                </div>
            </header>

            {/* 2. Collapsible Category Bar (Top Icon & Bottom Text -> Pills on Scroll) */}
            <nav 
                style={{
                    display: 'flex',
                    background: COLORS.CARD_BG,
                    padding: isScrolled ? '8px 16px' : '10px 16px 8px 16px',
                    gap: isScrolled ? '8px' : '10px',
                    position: 'sticky',
                    top: '56px',
                    zIndex: 90,
                    boxShadow: isScrolled ? '0 2px 8px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.02)',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    transition: 'all 0.2s ease',
                    alignItems: isScrolled ? 'center' : 'flex-start'
                }} 
                className="hide-scrollbar"
            >
                {CATEGORIES.map(cat => {
                    const isSelected = selectedCategory === cat.name;

                    if (isScrolled) {
                        // Collapsed View: Only Name / Compact Pill
                        return (
                            <div
                                key={cat.name}
                                onClick={() => setSelectedCategory(cat.name)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    flexShrink: 0,
                                    padding: '6px 14px',
                                    borderRadius: '99px',
                                    fontSize: '12px',
                                    fontWeight: isSelected ? '700' : '600',
                                    cursor: 'pointer',
                                    background: isSelected ? COLORS.PRIMARY : '#F8FAFC',
                                    color: isSelected ? '#FFF' : '#334155',
                                    transition: 'all 0.15s ease',
                                    border: `1px solid ${isSelected ? COLORS.PRIMARY : '#E2E8F0'}`,
                                    boxShadow: isSelected ? '0 2px 6px rgba(30, 58, 138, 0.25)' : 'none'
                                }}
                            >
                                <span>{cat.emoji}</span>
                                <span>{cat.name}</span>
                            </div>
                        );
                    }

                    // Expanded View: Upper Circle Image + Bottom Name
                    return (
                        <div
                            key={cat.name}
                            onClick={() => setSelectedCategory(cat.name)}
                            style={{
                                width: '74px',
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px 4px 6px 4px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(30, 58, 138, 0.08)' : 'transparent',
                                border: isSelected ? '1.5px solid rgba(30, 58, 138, 0.3)' : '1.5px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: isSelected ? COLORS.PRIMARY : '#FFFFFF',
                                border: isSelected ? `1.5px solid ${COLORS.PRIMARY}` : '1.5px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                color: isSelected ? '#FFFFFF' : '#334155',
                                boxShadow: isSelected ? '0 4px 8px rgba(30, 58, 138, 0.25)' : '0 2px 4px rgba(0,0,0,0.03)',
                                transition: 'all 0.2s ease'
                            }}>
                                <span>{cat.emoji}</span>
                            </div>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: isSelected ? '700' : '600',
                                color: isSelected ? COLORS.PRIMARY : '#475569',
                                marginTop: '6px',
                                textAlign: 'center',
                                lineHeight: '1.2',
                                whiteSpace: 'normal',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {cat.name}
                            </span>
                        </div>
                    );
                })}
            </nav>

            {/* Main Content Area */}
            <main style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* ── FOR YOU TAB CONTENT ───────────────────────────── */}
                {selectedCategory === 'For You' && (
                    <>
                        {/* Offers Banner */}
                        <OffersSection isLoggedIn={isLoggedIn} />

                        {/* Time Contextual Recommendations */}
                        {timeContextual.items.length > 0 && (
                            <section style={{ padding: '16px 20px 8px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '20px' }}>{timeContextual.emoji}</span>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: 0 }}>
                                            {timeContextual.title}
                                        </h3>
                                        <p style={{ fontSize: '12px', color: COLORS.TEXT_MUTED, margin: '2px 0 0 0', fontWeight: '500' }}>
                                            {timeContextual.subtitle}
                                        </p>
                                    </div>
                                </div>
                                <div 
                                    className="hide-scrollbar" 
                                    style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}
                                >
                                    {timeContextual.items.map((item, idx) => (
                                        <div key={idx} style={{ width: '160px', flexShrink: 0 }}>
                                            <ProductCard item={item} onAdd={handleQuickAdd} addingState={addingToCart[item.id || item._id]} />
                                        </div>
                                    ))}
                                    <SeeAllCategoryCard 
                                        categoryName="Food & Snacks" 
                                        emoji={timeContextual.emoji} 
                                        onSelect={() => {
                                            setSelectedCategory('Food');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }} 
                                    />
                                </div>
                            </section>
                        )}

                        {/* Popular Picks (For You) */}
                        {forYouPicks.length > 0 && (
                            <section style={{ padding: '16px 20px 8px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ background: '#EFF6FF', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: COLORS.PRIMARY, fontSize: '14px' }}></i>
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: 0 }}>For You</h3>
                                            <p style={{ fontSize: '11px', color: COLORS.TEXT_MUTED, margin: 0 }}>Popular picks in {initialBazaarName || 'your bazaar'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div 
                                    className="hide-scrollbar" 
                                    style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}
                                >
                                    {forYouPicks.map((item, idx) => (
                                        <div key={idx} style={{ width: '160px', flexShrink: 0 }}>
                                            <ProductCard item={item} onAdd={handleQuickAdd} addingState={addingToCart[item.id || item._id]} />
                                        </div>
                                    ))}
                                    <SeeAllCategoryCard 
                                        categoryName="Popular Picks" 
                                        emoji="⚡" 
                                        onSelect={() => {
                                            setSelectedCategory('Food');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }} 
                                    />
                                </div>
                            </section>
                        )}

                        {/* Buy Again Section */}
                        {buyAgainItems.length > 0 && (
                            <section style={{ padding: '16px 20px 8px 20px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.TEXT_MAIN, marginBottom: '12px' }}>
                                    <i className="fa-solid fa-rotate-right" style={{ color: COLORS.PRIMARY, marginRight: '8px' }}></i>
                                    Buy Again
                                </h3>
                                <div className="hide-scrollbar" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                                    {buyAgainItems.map((item, idx) => (
                                        <div key={idx} style={{ width: '160px', flexShrink: 0 }}>
                                            <ProductCard item={item} onAdd={handleQuickAdd} addingState={addingToCart[item.id || item._id]} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Curated Category Shelves on For You */}
                        {CATEGORIES.filter(c => c.name !== 'For You').map(cat => {
                            const catName = cat.name;
                            const shelfItems = currentItems
                                .filter(it => itemBelongsToMainCategory(it, catName))
                                .slice(0, 10);
                            if (shelfItems.length === 0) return null;

                            return (
                                <section key={catName} style={{ padding: '16px 20px 8px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '18px' }}>{cat.emoji}</span>
                                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: 0 }}>{catName}</h3>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedCategory(catName)}
                                            style={{ background: 'none', border: 'none', color: COLORS.PRIMARY, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                        >
                                            See All
                                        </button>
                                    </div>
                                    <div className="hide-scrollbar" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                                        {shelfItems.map((item, idx) => (
                                            <div key={idx} style={{ width: '160px', flexShrink: 0 }}>
                                                <ProductCard item={item} onAdd={handleQuickAdd} addingState={addingToCart[item.id || item._id]} />
                                            </div>
                                        ))}
                                        <SeeAllCategoryCard 
                                            categoryName={catName} 
                                            emoji={cat.emoji} 
                                            onSelect={() => {
                                                setSelectedCategory(catName);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }} 
                                        />
                                    </div>
                                </section>
                            );
                        })}
                    </>
                )}

                {/* ── CATEGORY MODE VIEW (Food, Grocery, Fashion, Footwear, Automobile...) ── */}
                {selectedCategory !== 'For You' && (
                    <>
                        {/* 1. Related Shops in Spotlight */}
                        {filteredShops.length > 0 && (
                            <section style={{ padding: '16px 20px 10px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>🏪</span>
                                        <div>
                                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: 0 }}>
                                                Shops in Spotlight
                                            </h3>
                                            <p style={{ fontSize: '11px', color: COLORS.TEXT_MUTED, margin: 0 }}>
                                                Top stores in {selectedCategory}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => window.location.href = `/shops?category=${encodeURIComponent(selectedCategory)}`}
                                        style={{ background: 'none', border: 'none', color: COLORS.PRIMARY, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                    >
                                        See All
                                    </button>
                                </div>

                                <div className="hide-scrollbar" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                                    {filteredShops.map(shop => (
                                        <ShopCard key={shop._id || shop.id} shop={shop} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 2. Sub-Category Filter Chips */}
                        {CATEGORY_SUB_CATEGORIES[selectedCategory] && (
                            <section style={{ background: COLORS.CARD_BG, padding: '12px 20px', borderTop: `1px solid ${COLORS.BORDER}`, borderBottom: `1px solid ${COLORS.BORDER}`, marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: COLORS.TEXT_MAIN }}>
                                        <i className="fa-solid fa-sliders" style={{ color: COLORS.PRIMARY, fontSize: '12px' }}></i>
                                        <span>Explore by Sub-Category</span>
                                    </div>
                                    {selectedSubCategory !== 'All' && (
                                        <button 
                                            onClick={() => setSelectedSubCategory('All')}
                                            style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                        >
                                            Clear Filter
                                        </button>
                                    )}
                                </div>

                                <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                                    {CATEGORY_SUB_CATEGORIES[selectedCategory].map(sub => {
                                        const isSelected = selectedSubCategory === sub.name;
                                        return (
                                            <button
                                                key={sub.name}
                                                onClick={() => setSelectedSubCategory(sub.name)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    flexShrink: 0,
                                                    padding: '6px 14px',
                                                    borderRadius: '99px',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    border: `1px solid ${isSelected ? COLORS.PRIMARY : COLORS.BORDER}`,
                                                    background: isSelected ? COLORS.PRIMARY : '#F8FAFC',
                                                    color: isSelected ? '#FFF' : COLORS.TEXT_MAIN,
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <span>{sub.icon}</span>
                                                <span>{sub.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* 3. Products Grid */}
                        <section style={{ padding: '0 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <h2 style={{ fontSize: '17px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: 0 }}>
                                    {selectedSubCategory !== 'All' ? `${selectedSubCategory} (${selectedCategory})` : `${selectedCategory} Products`}
                                </h2>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: COLORS.TEXT_MUTED }}>
                                    {filteredProducts.length} items
                                </span>
                            </div>

                            {isLoading ? (
                                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                                    <div className="spinner" style={{ width: '36px', height: '36px', border: `3px solid ${COLORS.BORDER}`, borderTopColor: COLORS.PRIMARY, borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                                    <p style={{ marginTop: '12px', color: COLORS.TEXT_MUTED, fontSize: '14px' }}>Loading products...</p>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div style={{ background: COLORS.CARD_BG, padding: '48px 24px', borderRadius: '16px', textAlign: 'center', border: `1px solid ${COLORS.BORDER}` }}>
                                    <i className="fa-solid fa-magnifying-glass-chart" style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '16px' }}></i>
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: '0 0 6px 0' }}>
                                        No products found in "{selectedSubCategory}"
                                    </h3>
                                    <p style={{ fontSize: '13px', color: COLORS.TEXT_MUTED, margin: '0 0 16px 0' }}>
                                        Try selecting another sub-category or reset to view all products.
                                    </p>
                                    <button 
                                        onClick={() => setSelectedSubCategory('All')}
                                        style={{
                                            background: COLORS.PRIMARY,
                                            color: '#FFF',
                                            border: 'none',
                                            padding: '10px 20px',
                                            borderRadius: '99px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        View All {selectedCategory} Products
                                    </button>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                    gap: '12px'
                                }}>
                                    {filteredProducts.map((item, idx) => (
                                        <ProductCard 
                                            key={item.id || item._id || idx} 
                                            item={item} 
                                            onAdd={handleQuickAdd} 
                                            addingState={addingToCart[item.id || item._id]}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}

            </main>

            {/* ── PASR Coins Modal ────────────────────────────────────────── */}
            {showCoinsModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#FFF', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <i className="fa-solid fa-coins" style={{ color: '#D97706', fontSize: '24px' }}></i>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: 0 }}>PASR Coins</h2>
                        </div>
                        <p style={{ color: COLORS.TEXT_MUTED, fontSize: '14px', lineHeight: '1.5' }}>
                            PASR Coins are rewards you earn on every order and referral. Use them to get instant discounts on checkout!
                        </p>
                        <button 
                            onClick={() => setShowCoinsModal(false)}
                            style={{ width: '100%', background: COLORS.PRIMARY, color: '#FFF', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '700', marginTop: '16px', cursor: 'pointer' }}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {/* ── Bazaar Selector Modal ────────────────────────────────────── */}
            {showBazaarModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#FFF', borderRadius: '24px', padding: '24px', maxWidth: '480px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: 0 }}>Select Local Bazaar</h2>
                            <button onClick={() => setShowBazaarModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: COLORS.TEXT_MUTED }}>✕</button>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search your bazaar..." 
                            value={bazaarSearch} 
                            onChange={(e) => setBazaarSearch(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '99px', border: `1px solid ${COLORS.BORDER}`, marginBottom: '12px', outline: 'none', fontSize: '14px' }}
                        />
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {bazaars.filter(b => (b.name || '').toLowerCase().includes(bazaarSearch.toLowerCase())).map(b => (
                                <div 
                                    key={b._id}
                                    onClick={async () => {
                                        await fetch('/api/bazaars/select', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ bazaarId: b._id })
                                        });
                                        window.location.reload();
                                    }}
                                    style={{ padding: '12px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                                >
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="fa-solid fa-store" style={{ color: COLORS.PRIMARY }}></i>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.TEXT_MAIN }}>{b.name}</div>
                                        <div style={{ fontSize: '11px', color: COLORS.TEXT_MUTED }}>{b.location}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Reusable Product Card Component (Matches Flutter _ProductCard) ─────────
function ProductCard({ item, onAdd, addingState }) {
    if (!item) return null;
    const isDiscounted = (item.discount || 0) > 0;
    const actualPrice = item.actualPrice || (isDiscounted ? Math.round(item.price * (1 - item.discount / 100)) : item.price);
    const imageUrl = item.image || item.img?.url || (item.productImage && item.productImage[0]?.url) || '/images/placeholder.jpg';
    const itemId = item.id || item._id;

    return (
        <div 
            onClick={() => {
                saveViewedService({ ...item, id: itemId });
                window.location.href = `/items/${itemId}`;
            }}
            style={{
                background: COLORS.CARD_BG,
                borderRadius: '16px',
                border: `1px solid ${COLORS.BORDER}`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                position: 'relative',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
        >
            {/* Image Container */}
            <div style={{ position: 'relative', width: '100%', paddingTop: '80%', background: '#F1F5F9' }}>
                <img 
                    src={imageUrl} 
                    alt={item.productName || item.name} 
                    loading="lazy"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {isDiscounted && (
                    <span style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: '#DC2626',
                        color: '#FFF',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '800'
                    }}>
                        {item.discount}% OFF
                    </span>
                )}
            </div>

            {/* Product Details */}
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                    <h4 style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: COLORS.TEXT_MAIN,
                        margin: '0 0 4px 0',
                        lineHeight: '1.3',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}>
                        {item.productName || item.name}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: COLORS.TEXT_MUTED, marginBottom: '8px' }}>
                        <i className="fa-solid fa-store" style={{ fontSize: '10px', color: COLORS.PRIMARY }}></i>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.shopName || (item.shop && item.shop.shopName) || 'Verified Store'}
                        </span>
                    </div>
                </div>

                {/* Price & Add Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                    <div>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: COLORS.TEXT_MAIN }}>
                            ₹{actualPrice}
                        </span>
                        {isDiscounted && (
                            <span style={{ fontSize: '11px', color: COLORS.TEXT_MUTED, textDecoration: 'line-through', marginLeft: '4px' }}>
                                ₹{item.price}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={(e) => onAdd(e, item)}
                        style={{
                            background: addingState === 'added' ? COLORS.SUCCESS : COLORS.PRIMARY_LIGHT,
                            color: addingState === 'added' ? '#FFF' : COLORS.PRIMARY,
                            border: `1px solid ${addingState === 'added' ? COLORS.SUCCESS : '#BFDBFE'}`,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {addingState === 'added' ? (
                            <>
                                <i className="fa-solid fa-check"></i>
                                <span>Added</span>
                            </>
                        ) : addingState === true ? (
                            <span>...</span>
                        ) : (
                            <>
                                <i className="fa-solid fa-plus" style={{ fontSize: '10px' }}></i>
                                <span>ADD</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Reusable Shop Card Component (Matches Flutter _ShopCard) ───────────────
function ShopCard({ shop }) {
    if (!shop) return null;
    const shopId = shop._id || shop.id;
    const imageUrl = shop.image || (shop.shopImage && shop.shopImage[0]?.url) || '/images/localshops.jpg';

    return (
        <div 
            onClick={() => window.location.href = `/shops/${shopId}`}
            style={{
                width: '180px',
                flexShrink: 0,
                background: COLORS.CARD_BG,
                borderRadius: '16px',
                border: `1px solid ${COLORS.BORDER}`,
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ position: 'relative', width: '100%', height: '90px', background: '#F1F5F9' }}>
                <img src={imageUrl} alt={shop.shopName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{
                    position: 'absolute',
                    bottom: '6px',
                    left: '6px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#FFF',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: '700'
                }}>
                    ⭐ 4.5
                </span>
            </div>

            <div style={{ padding: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {shop.shopName}
                </h4>
                <p style={{ fontSize: '11px', color: COLORS.TEXT_MUTED, margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {shop.category || 'General Store'}
                </p>
                <div style={{ fontSize: '10px', color: COLORS.PRIMARY, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <i className="fa-solid fa-location-dot"></i>
                    <span>{shop.location || 'Nearby'}</span>
                </div>
            </div>
        </div>
    );
}

// ── Reusable See All Category Card Component (Matches Flutter _SeeAllCategoryCard) ──
function SeeAllCategoryCard({ categoryName, emoji, onSelect }) {
    return (
        <div
            onClick={onSelect}
            style={{
                width: '160px',
                minHeight: '230px',
                flexShrink: 0,
                background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)',
                borderRadius: '16px',
                border: '1px solid #BFDBFE',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(30, 58, 138, 0.06)',
                transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(30, 58, 138, 0.12)';
                e.currentTarget.style.borderColor = COLORS.PRIMARY;
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(30, 58, 138, 0.06)';
                e.currentTarget.style.borderColor = '#BFDBFE';
            }}
        >
            <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: COLORS.PRIMARY,
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(30, 58, 138, 0.25)',
                marginBottom: '12px'
            }}>
                <i className="fa-solid fa-arrow-right" style={{ fontSize: '18px' }}></i>
            </div>

            <h4 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.TEXT_MAIN, margin: '0 0 4px 0' }}>
                See All
            </h4>
            <p style={{ fontSize: '12px', color: COLORS.TEXT_MUTED, margin: '0 0 10px 0', fontWeight: '600' }}>
                {categoryName}
            </p>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#DBEAFE',
                color: COLORS.PRIMARY,
                padding: '4px 10px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '700'
            }}>
                <span>{emoji}</span>
                <span>Explore More</span>
            </div>
        </div>
    );
}

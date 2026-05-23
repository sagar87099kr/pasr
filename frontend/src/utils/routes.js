/**
 * Centralized Route Mappings for PASR Platform
 * Used to map category names (from DB or items) to their specific functional routes.
 */

export const CATEGORY_ROUTE_MAP = {
    // Vehicles
    'Four Wheelers': '/car',
    'Four Wheeler': '/car',
    'Four Wheeler & Transport': '/car',
    'Car': '/car',
    'SUV': '/car',
    'Sedan': '/car',
    'HMV (Bus)': '/bus',
    'Bus': '/bus',
    'Three Wheelers': '/three-weelers',
    'Three Wheeler': '/three-weelers',
    'Auto': '/three-weelers',
    'Auto Rickshaw': '/three-weelers',

    // Agriculture
    'Farming Vehicles': '/farm',
    'Farming': '/farm',
    'Agriculture': '/farm',
    'Tractor': '/farm',
    'Tractors': '/farm',
    'Kisan Sabha': '/kisan-sabha',

    // Events & Services
    'Caterings': '/caterings',
    'Catering': '/caterings',
    'Filming': '/filming',
    'Filming & Photography': '/filming',
    'Decoration': '/decor',
    'Event Decoration': '/decor',
    'Event Decorators': '/decor',
    'Decor': '/decor',
    'DJ and Tent': '/djdecor',
    'DJ & Tent': '/djdecor',
    'DJ/Events': '/djdecor',
    'DJ': '/djdecor',
    'Band Party': '/bandparty',
    'Heavy Equipments': '/heavy',
    'Heavy': '/heavy',
    'Home Service provider': '/homeservice',
    'Home Service': '/homeservice',
    'Home Services': '/homeservice',
    'Repair': '/homeservice',

    // Shops & Bazaar
    'Local Bazaar': '/localMarket',
    'Bazaar': '/localMarket',
    'Market': '/localMarket',
    'Shops': '/shops',
    'Local Shops': '/shops',
    'Medical': '/shops?category=Medical',
    'Medical Shop': '/shops?category=Medical',
    'Grocery': '/shops?category=Grocery',
    'General Store': '/shops?category=Grocery',
    'Kirana': '/shops?category=Grocery',

    // Fallbacks
    'Others': '/others'
};

/**
 * Returns the specific route for a given category name.
 * Falls back to /categories if no mapping is found.
 */
export const getRouteForCategory = (categoryName) => {
    if (!categoryName) return '/categories';
    
    // Exact match
    if (CATEGORY_ROUTE_MAP[categoryName]) {
        return CATEGORY_ROUTE_MAP[categoryName];
    }

    // Case-insensitive search if no exact match
    const lowerCategory = categoryName.toLowerCase();
    for (const [key, value] of Object.entries(CATEGORY_ROUTE_MAP)) {
        if (key.toLowerCase() === lowerCategory) {
            return value;
        }
    }

    // Fallback to /categories with query param if still no match
    return `/categories?type=${encodeURIComponent(categoryName)}`;
};

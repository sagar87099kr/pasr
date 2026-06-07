/**
 * LocalStorage utility for personalization.
 * Version 2: Enhanced for Rural Commerce (Shops & Bazaar)
 */

const STORAGE_KEYS = {
    RECENTLY_VIEWED: 'pasr_recently_viewed',
};

export const saveViewedService = (item) => {
    if (!item || !item.id) return;

    try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED) || '[]');
        
        // Remove duplicate
        const filtered = existing.filter(i => i.id !== item.id);
        
        // Add to beginning and keep last 5
        const updated = [item, ...filtered].slice(0, 5);
        
        localStorage.setItem(STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to save tracking data', e);
    }
};

export const getRecentlyViewed = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED) || '[]');
    } catch (e) {
        return [];
    }
};

/**
 * Rural Need-Based Mapping (V2)
 * Focused on everyday goods and bazaar transactions.
 */
export const getRecommendationMapping = (category) => {
    const mapping = {
        // Daily Bazaar Items
        'Dairy': ['Bakery', 'Eggs', 'Grocery'],
        'Vegetables': ['Fruits', 'Spices', 'Grocery'],
        'Grocery': ['Cooking Oil', 'Flour', 'Spices', 'Cleaning'],
        'Medical': ['Healthcare', 'Baby Care'],
        
        // Agriculture (Kisan Sabha)
        'Agriculture': ['Fertilizers', 'Farm Tools', 'Seeds', 'Tractor'],
        'Livestock': ['Animal Feed', 'Veterinary'],
        
        // Special Events (Original)
        'DJ': ['Decoration', 'Catering', 'Tent'],
        'Catering': ['Tent', 'DJ', 'Decoration'],
        'Decoration': ['DJ', 'Catering', 'Tent']
    };
    
    return mapping[category] || ['Grocery', 'Vegetables', 'Dairy', 'Medical'];
};

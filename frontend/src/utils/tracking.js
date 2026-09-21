/**
 * LocalStorage & Server Sync utility for PASR Personalization.
 * Version 3: Universal Super-App Personalization (Grocery, Services, Kisan, Shops)
 */

const STORAGE_KEYS = {
    RECENTLY_VIEWED: 'pasr_recently_viewed',
    RECENT_SEARCHES: 'pasr_recent_searches',
    CATEGORY_AFFINITIES: 'pasr_category_affinities',
    USER_PERSONA: 'pasr_inferred_persona'
};

/**
 * Record a viewed product, service, or shop
 */
export const saveViewedItem = (item) => {
    if (!item || !(item.id || item._id)) return;
    const itemId = item.id || item._id;

    try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED) || '[]');
        const filtered = existing.filter(i => (i.id || i._id) !== itemId);
        
        const newItem = {
            id: itemId,
            _id: itemId,
            title: item.name || item.title || item.productName || 'Item',
            price: item.price || 0,
            image: item.image || (item.img ? item.img.url : '') || '',
            category: item.category || item.itemCategory || item.shopCategory || 'Grocery',
            type: item.type || 'product',
            timestamp: Date.now()
        };

        const updated = [newItem, ...filtered].slice(0, 15);
        localStorage.setItem(STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(updated));

        // Increment category affinity
        if (newItem.category) {
            recordCategoryInteraction(newItem.category, 1);
        }

        // Sync with backend
        syncActivityToServer({
            eventType: 'view',
            item: newItem
        });
    } catch (e) {
        console.error('Failed to save viewed item', e);
    }
};

export const saveViewedService = (item) => {
    saveViewedItem({ ...item, type: 'service' });
};

export const getRecentlyViewed = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED) || '[]');
    } catch (e) {
        return [];
    }
};

/**
 * Save user search query
 */
export const saveSearchQuery = (query, category = '') => {
    const trimmed = String(query || '').trim();
    if (!trimmed) return;

    try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES) || '[]');
        const filtered = existing.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
        const updated = [trimmed, ...filtered].slice(0, 10);
        localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));

        syncActivityToServer({
            eventType: 'search',
            query: trimmed,
            category
        });
    } catch (e) {
        console.error('Failed to save search query', e);
    }
};

export const getRecentSearches = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES) || '[]');
    } catch (e) {
        return [];
    }
};

export const removeRecentSearch = (query) => {
    try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES) || '[]');
        const filtered = existing.filter(q => q.toLowerCase() !== query.toLowerCase());
        localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(filtered));
    } catch (e) {
        console.error('Failed to remove search', e);
    }
};

/**
 * Record category affinity and re-infer persona
 */
export const recordCategoryInteraction = (category, weight = 2) => {
    if (!category) return;
    try {
        const affinities = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORY_AFFINITIES) || '{}');
        affinities[category] = (affinities[category] || 0) + weight;
        localStorage.setItem(STORAGE_KEYS.CATEGORY_AFFINITIES, JSON.stringify(affinities));

        const persona = computePersona(affinities);
        localStorage.setItem(STORAGE_KEYS.USER_PERSONA, persona);

        syncActivityToServer({
            eventType: 'category_click',
            category
        });
    } catch (e) {
        console.error('Failed to record category interaction', e);
    }
};

export const getInferredPersona = () => {
    try {
        return localStorage.getItem(STORAGE_KEYS.USER_PERSONA) || 'GENERAL';
    } catch (e) {
        return 'GENERAL';
    }
};

function computePersona(affinities) {
    let groceryScore = 0;
    let serviceScore = 0;
    let kisanScore = 0;
    let total = 0;

    const groceryKeywords = ['grocery', 'vegetables', 'fruits', 'bakery', 'general', 'dairy', 'staples', 'sweet', 'food'];
    const serviceKeywords = ['electrician', 'plumber', 'carpenter', 'painter', 'home services', 'salon', 'repair', 'services'];
    const kisanKeywords = ['kisan', 'seeds', 'fertilizer', 'tractor', 'farm', 'equipment', 'agriculture'];

    Object.entries(affinities).forEach(([cat, count]) => {
        const lower = cat.toLowerCase();
        const cnt = Number(count) || 1;
        total += cnt;

        if (groceryKeywords.some(k => lower.includes(k))) groceryScore += cnt;
        if (serviceKeywords.some(k => lower.includes(k))) serviceScore += cnt;
        if (kisanKeywords.some(k => lower.includes(k))) kisanScore += cnt;
    });

    if (total === 0) return 'GENERAL';
    if (groceryScore / total >= 0.45) return 'GROCERY';
    if (serviceScore / total >= 0.35) return 'SERVICES';
    if (kisanScore / total >= 0.35) return 'KISAN';
    return 'GENERAL';
}

function syncActivityToServer(payload) {
    try {
        fetch('/api/personalization/track-activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => {});
    } catch (_) {}
}

export const getRecommendationMapping = (category) => {
    const mapping = {
        'Dairy': ['Bakery', 'Eggs', 'Grocery'],
        'Vegetables': ['Fruits', 'Spices', 'Grocery'],
        'Grocery': ['Cooking Oil', 'Flour', 'Spices', 'Cleaning'],
        'Medical': ['Healthcare', 'Baby Care'],
        'Agriculture': ['Fertilizers', 'Farm Tools', 'Seeds', 'Tractor'],
        'Livestock': ['Animal Feed', 'Veterinary'],
        'DJ': ['Decoration', 'Catering', 'Tent'],
        'Catering': ['Tent', 'DJ', 'Decoration'],
        'Decoration': ['DJ', 'Catering', 'Tent']
    };
    return mapping[category] || ['Grocery', 'Vegetables', 'Dairy', 'Medical'];
};

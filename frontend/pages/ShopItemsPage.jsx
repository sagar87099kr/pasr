import React, { useState, useEffect } from 'react';
import ServiceCard from '../components/home/ServiceCard';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    SECONDARY: '#F97316',  // Orange
    BG: '#F9FAFB',         // Off-White
    SURFACE: '#FFFFFF',    // White
    TEXT: '#1F2937',
    TEXT_SEC: '#6B7280'
};

const getQueryParam = (param) => {
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }
    return null;
};

const ShopItemsPage = ({ isLoggedIn }) => {
    const [homeItems, setHomeItems] = useState([]);
    const [homeItemCats, setHomeItemCats] = useState([{ name: "All", parent: "General" }]);
    const [selectedItemCat, setSelectedItemCat] = useState(getQueryParam('subCategory') || "All");
    const [userLoc, setUserLoc] = useState({ lat: null, lon: null, resolved: false });
    const [isLoading, setIsLoading] = useState(true);

    // Advanced Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [selectedShopCat, setSelectedShopCat] = useState(getQueryParam('category') || "All Shops");
    const [minDiscount, setMinDiscount] = useState(0);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("newest");

    // Full list of platform-supported shop categories
    const SHOP_TYPES = [
        "All Shops", "Electronics", "Grocery", "Fashion", "General Store", "Footwear", 
        "Automobile", "Bakery", "Dhaba", "Furniture", "Hardware", "Jewelers", 
        "Medical", "Mobile Shop", "Non-Veg", "Printing & Digital", "Restaurant", 
        "Salon", "Seeds & Fertilizers", "Sports", "Stationery", "Vegetables & Fruits", 
        "Beauty/Cosmetics", "Coaching", "Sweet Shop"
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        // Try to get browser location
        if ("geolocation" in navigator) {
            setTimeout(() => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        setUserLoc({ lat: latitude, lon: longitude, resolved: true });
                    },
                    (error) => {
                        console.warn("Geolocation denied or failed:", error);
                        setUserLoc({ lat: null, lon: null, resolved: true });
                    },
                    { timeout: 10000 }
                );
            }, 5000);
        } else {
            setUserLoc({ lat: null, lon: null, resolved: true });
        }
    }, []);

    useEffect(() => {
        if (!userLoc.resolved) return;

        const fetchHomeItems = async () => {
            setIsLoading(true);
            try {
                let url = `/api/home/items?`;
                if (userLoc.lat && userLoc.lon) {
                    url += `lat=${userLoc.lat}&lon=${userLoc.lon}&`;
                }
                if (selectedItemCat !== "All") {
                    url += `category=${encodeURIComponent(selectedItemCat)}&`;
                }
                if (selectedShopCat !== "All Shops") {
                    url += `shopCategory=${encodeURIComponent(selectedShopCat)}&`;
                }
                if (debouncedSearch) {
                    url += `q=${encodeURIComponent(debouncedSearch)}&`;
                }
                if (minDiscount > 0) {
                    url += `minDiscount=${minDiscount}&`;
                }
                if (minPrice) {
                    url += `minPrice=${minPrice}&`;
                }
                if (maxPrice) {
                    url += `maxPrice=${maxPrice}&`;
                }
                if (sortBy) {
                    url += `sort=${sortBy}&`;
                }

                const response = await fetch(url);
                const result = await response.json();
                if (result && result.items) {
                    setHomeItems(result.items);
                    if (result.categories) {
                        setHomeItemCats(result.categories);
                    }
                }
            } catch (err) {
                console.error("Shop items fetch failed:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHomeItems();
    }, [userLoc, selectedItemCat, selectedShopCat, debouncedSearch, minDiscount, minPrice, maxPrice, sortBy]);

    const resetFilters = () => {
        setMinDiscount(0);
        setMinPrice("");
        setMaxPrice("");
        setSortBy("newest");
        setSelectedShopCat("All Shops");
        setSelectedItemCat("All");
        setSearchQuery("");
    };

    return (
        <div style={{ background: COLORS.BG, minHeight: '100vh', paddingBottom: '40px' }}>
            {/* Header with Search */}
            <div style={{
                background: COLORS.SURFACE,
                padding: '16px 20px',
                borderBottom: '1px solid #E5E7EB',
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={() => window.location.href = '/'}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: COLORS.PRIMARY
                        }}
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    
                    {/* Modern Search Bar */}
                    <div style={{ 
                        flex: 1, 
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <i className="fa-solid fa-magnifying-glass" style={{
                            position: 'absolute',
                            left: '14px',
                            color: COLORS.TEXT_SEC,
                            fontSize: '14px'
                        }}></i>
                        <input 
                            type="text" 
                            placeholder="Search products or shops..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 40px',
                                borderRadius: '12px',
                                border: '1.5px solid #E5E7EB',
                                fontSize: '14px',
                                outline: 'none',
                                background: '#F9FAFB'
                            }}
                        />
                    </div>

                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            background: showFilters ? COLORS.PRIMARY : '#F3F4F6',
                            color: showFilters ? '#FFF' : COLORS.TEXT,
                            border: 'none',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '700',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className="fa-solid fa-sliders"></i>
                        <span className="hide-on-mobile">Filters</span>
                    </button>
                </div>

                {/* Filter Rows Container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {/* 1. Shop Category (Parent) Scroll */}
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: COLORS.TEXT_SEC, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                            Filter by Store Type
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            overflowX: 'auto',
                            scrollbarWidth: 'none',
                            padding: '2px 0'
                        }} className="hide-scrollbar">
                            {SHOP_TYPES.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedShopCat(type)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        whiteSpace: 'nowrap',
                                        border: '1.5px solid',
                                        borderColor: selectedShopCat === type ? COLORS.SECONDARY : '#E5E7EB',
                                        background: selectedShopCat === type ? COLORS.SECONDARY : 'transparent',
                                        color: selectedShopCat === type ? '#FFF' : COLORS.TEXT_SEC,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. Item Category (Product) Scroll - Contextual */}
                    {selectedShopCat !== "All Shops" && (
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: COLORS.TEXT_SEC, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                                Filter by {selectedShopCat} Categories
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                overflowX: 'auto',
                                scrollbarWidth: 'none',
                                padding: '2px 0'
                            }} className="hide-scrollbar">
                                <button
                                    onClick={() => setSelectedItemCat("All")}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        whiteSpace: 'nowrap',
                                        border: '1.5px solid',
                                        borderColor: selectedItemCat === "All" ? COLORS.PRIMARY : '#E5E7EB',
                                        background: selectedItemCat === "All" ? COLORS.PRIMARY : 'transparent',
                                        color: selectedItemCat === "All" ? '#FFF' : COLORS.TEXT_SEC,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    All
                                </button>
                                {homeItemCats.filter(cat => cat.parent === selectedShopCat).map((cat) => (
                                    <button
                                        key={cat.name}
                                        onClick={() => setSelectedItemCat(cat.name)}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            whiteSpace: 'nowrap',
                                            border: '1.5px solid',
                                            borderColor: selectedItemCat === cat.name ? COLORS.PRIMARY : '#E5E7EB',
                                            background: selectedItemCat === cat.name ? COLORS.PRIMARY : 'transparent',
                                            color: selectedItemCat === cat.name ? '#FFF' : COLORS.TEXT_SEC,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'flex', padding: '16px 20px', gap: '20px' }}>
                
                {/* Desktop Filter Sidebar */}
                {(showFilters) && (
                    <div style={{
                        width: '280px',
                        background: COLORS.SURFACE,
                        borderRadius: '20px',
                        padding: '24px',
                        height: 'fit-content',
                        position: 'sticky',
                        top: '180px',
                        border: '1px solid #E5E7EB',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Quick Filters</h3>
                            <button 
                                onClick={resetFilters}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: COLORS.SECONDARY, 
                                    fontSize: '12px', 
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Reset All
                            </button>
                        </div>

                        {/* Sort Logic */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: COLORS.TEXT }}>Sort Results</label>
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #E5E7EB',
                                    fontSize: '14px',
                                    outline: 'none',
                                    background: '#F9FAFB'
                                }}
                            >
                                <option value="newest">Newest First</option>
                                <option value="price_asc">Price: Lowest First</option>
                                <option value="price_desc">Price: Highest First</option>
                                <option value="discount_desc">Best Discount First</option>
                            </select>
                        </div>

                        {/* Discount Tier Buttons */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: COLORS.TEXT }}>Min. Discount</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {[0, 10, 25, 50].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setMinDiscount(d)}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            border: '1.5px solid',
                                            borderColor: minDiscount === d ? COLORS.PRIMARY : '#E5E7EB',
                                            background: minDiscount === d ? COLORS.PRIMARY : 'transparent',
                                            color: minDiscount === d ? '#FFF' : COLORS.TEXT_SEC,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {d === 0 ? 'Any' : `${d}% or more`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Range */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: COLORS.TEXT }}>Price Budget (₹)</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input 
                                    type="number" 
                                    placeholder="Min"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '13px', outline: 'none' }}
                                />
                                <span style={{ color: COLORS.TEXT_SEC }}>-</span>
                                <input 
                                    type="number" 
                                    placeholder="Max"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '13px', outline: 'none' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid Container */}
                <div style={{ flex: 1 }}>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}>
                            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '32px', color: COLORS.PRIMARY }}></i>
                            <p style={{ marginTop: '12px', color: COLORS.TEXT_SEC, fontSize: '14px' }}>Updating your products...</p>
                        </div>
                    ) : homeItems.length > 0 ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '20px'
                        }}>
                            {homeItems.map((item) => (
                                <div key={item.id}>
                                    <ServiceCard item={item} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '80px 20px', 
                            background: COLORS.SURFACE,
                            borderRadius: '24px',
                            border: '1.5px dashed #E5E7EB'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No matching items found</h3>
                            <p style={{ color: COLORS.TEXT_SEC, margin: 0 }}>Try using broader categories or clearing your search.</p>
                            <button 
                                onClick={resetFilters}
                                style={{ 
                                    marginTop: '24px', 
                                    background: COLORS.PRIMARY, 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '12px 24px', 
                                    borderRadius: '12px', 
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)'
                                }}
                            >
                                Clear all filters & search
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                @media (max-width: 768px) {
                    .hide-on-mobile { display: none; }
                }
            `}</style>
        </div>
    );
};

export default ShopItemsPage;

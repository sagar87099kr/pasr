import React, { useState, useEffect } from 'react';
import HeroSection from '../components/home/HeroSection';
import CartSection from '../components/home/CartSection';
import HorizontalSlider from '../components/home/HorizontalSlider';
import OffersSection from '../components/home/OffersSection';
import { getRecentlyViewed } from '../utils/tracking';
import { getRouteForCategory } from '../utils/routes';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    BG: '#F9FAFB'          // Off-White
};

// Mock data removed to ensure only verified items from the database are shown.

const HomePage = ({ isLoggedIn, initialLat, initialLon }) => {
    const [recentItems, setRecentItems] = useState([]);
    const [discoveryData, setDiscoveryData] = useState(null);
    const [homeItems, setHomeItems] = useState([]);
    const [homeItemCats, setHomeItemCats] = useState([{ name: "All", parent: "General" }]);
    const [selectedItemCat, setSelectedItemCat] = useState("All");
    const [selectedSubCats, setSelectedSubCats] = useState({});
    const [activeService, setActiveService] = useState('Shopping');
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [userLoc, setUserLoc] = useState({ 
        lat: (initialLat && initialLat !== 'undefined') ? parseFloat(initialLat) : null, 
        lon: (initialLon && initialLon !== 'undefined') ? parseFloat(initialLon) : null, 
        resolved: !!(initialLat && initialLat !== 'undefined' && initialLon && initialLon !== 'undefined') 
    });
    const [isLoading, setIsLoading] = useState(true);
    const [itemsLimit, setItemsLimit] = useState(8); // Show only 8 items initially
    const [loadedSections, setLoadedSections] = useState({}); // Track which sections are scrolled into view

    useEffect(() => {
        if (!userLoc.resolved) return;

        const fetchHomeItems = async () => {
            try {
                let url = `/api/home/items?`;
                if (userLoc.lat && userLoc.lon) {
                    url += `lat=${userLoc.lat}&lon=${userLoc.lon}&`;
                }
                if (selectedItemCat !== "All") {
                    url += `category=${encodeURIComponent(selectedItemCat)}`;
                }

                const response = await fetch(url);
                const result = await response.json();
                if (result && result.items) {
                    setHomeItems(result.items);
                    if (result.categories) {
                        setHomeItemCats(result.categories);
                    }
                } else if (Array.isArray(result)) {
                    setHomeItems(result);
                }
            } catch (err) {
                console.error("Home items fetch failed:", err);
            }
        };
        fetchHomeItems();
    }, [userLoc, selectedItemCat]);
    
    // Gradual loading effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setItemsLimit(100); // Show more items after 3 seconds
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // Intersection Observer to load sections on scroll
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.getAttribute('data-section-id');
                    setLoadedSections(prev => ({ ...prev, [sectionId]: true }));
                }
            });
        }, { rootMargin: '200px' });

        document.querySelectorAll('[data-section-id]').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, [discoveryData, homeItems]);

    useEffect(() => {

        // 1. Get Recently Viewed from LocalStorage
        const items = getRecentlyViewed();
        setRecentItems(items);

        // 2. Fetch Dynamic Discovery Data based on Location
        const fetchDiscovery = async (lat, lon) => {
            try {
                const url = lat && lon ? `/api/discovery?lat=${lat}&lon=${lon}` : '/api/discovery';
                const response = await fetch(url);
                const result = await response.json();
                if (result.success) {
                    setDiscoveryData(result.data);
                }
            } catch (err) {
                console.error("Discovery fetch failed:", err);
            } finally {
                setIsLoading(false);
            }
        };

        // Try to get browser location ONLY if we don't already have one resolved from session
        if ("geolocation" in navigator && !userLoc.resolved) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLoc({ lat: latitude, lon: longitude, resolved: true });
                    fetchDiscovery(latitude, longitude);
                    // Also sync with session for other pages
                    fetch('/set-location', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude, longitude })
                    });
                },
                (error) => {
                    console.warn("Geolocation denied or failed:", error);
                    setUserLoc({ lat: null, lon: null, resolved: true });
                    fetchDiscovery(); // Fallback to session/database location
                },
                { timeout: 5000 }
            );
        } else {
            setUserLoc({ lat: null, lon: null, resolved: true });
            fetchDiscovery();
        }
    }, []);

    // Only return database items. If empty, return empty array to hide the section.
    const getSliderData = (realData) => {
        if (realData && realData.length > 0) return realData;
        return [];
    };

    return (
        <div className="pasr-react-home" style={{ 
            background: COLORS.BG, 
            minHeight: '100vh',
            maxWidth: '100%',
            overflowX: 'hidden',
            paddingBottom: '40px'
        }}>
            {/* Service Switcher Tabs */}
            <div style={{
                display: 'flex',
                background: '#FFF',
                padding: '12px 20px',
                gap: '12px',
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }} className="hide-scrollbar">
                {[
                    { id: 'Shopping', label: 'Shopping', icon: 'fa-basket-shopping', route: '/' },
                    { id: 'Farm Fresh', label: 'Farm Fresh', icon: 'fa-tractor', route: '/localMarket' },
                    { id: 'Service', label: 'Service', icon: 'fa-screwdriver-wrench', route: '/service' }
                ].map(service => (
                    <div
                        key={service.id}
                        onClick={() => {
                            if (service.id === 'Shopping') {
                                setActiveService(service.id);
                            } else {
                                window.location.href = service.route;
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexShrink: 0,
                            padding: '10px 24px',
                            borderRadius: '99px',
                            fontSize: '14px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            background: activeService === service.id ? COLORS.PRIMARY : '#F3F4F6',
                            color: activeService === service.id ? '#FFF' : '#374151',
                            transition: 'all 0.3s ease',
                            border: `1px solid ${activeService === service.id ? COLORS.PRIMARY : '#E5E7EB'}`
                        }}
                    >
                        <i className={`fa-solid ${service.icon}`}></i>
                        {service.label}
                    </div>
                ))}
            </div>

            {/* Special Offers Section */}
            <OffersSection isLoggedIn={isLoggedIn} />


            {/* NEW: Continue Shopping (Cart Items) */}
            {discoveryData?.cartItems?.length > 0 && (
                <CartSection items={discoveryData.cartItems} />
            )}
            
            {/* 1. Recently Viewed (CONDITIONAL) */}
            {activeService === 'Shopping' ? (
                <>
                    {recentItems.length > 0 && (
                        <HorizontalSlider 
                            title="Recently Viewed" 
                            icon="fa-clock-rotate-left" 
                            data={recentItems} 
                            viewAllLink="/user"
                        />
                    )}

            {/* Bazaar Sliders Removed per user request */}

            {/* Featured Items grouped by Shop Category */}
            <section style={{ background: COLORS.BG, paddingTop: '16px' }}>
                {/* Dynamic Category Sliders */}
                {(() => {
                    const SEQUENCE = [
                        "Fashion", "Mobile Shop", "Electronics", "Footwear", "Grocery", "General Store", 
                        "Bakery", "Restaurant", "Vegetables & Fruits", "Medical", "Beauty/Cosmetics", 
                        "Hardware", "Sweet Shop", "Jewelers", "Furniture", "Dhaba", "Non-Veg", 
                        "Printing & Digital", "Salon", "Seeds & Fertilizers", "Sports", "Stationery", "Others"
                    ];

                    const groups = {};
                    const filteredItems = getSliderData(homeItems);
                    
                    filteredItems.forEach(item => {
                        const cat = item.parentCategory || "Others";
                        if (!groups[cat]) groups[cat] = [];
                        groups[cat].push(item);
                    });
                    
                    const sortedKeys = Object.keys(groups).sort((a, b) => {
                        let indexA = SEQUENCE.indexOf(a);
                        let indexB = SEQUENCE.indexOf(b);
                        if (indexA === -1) indexA = 999;
                        if (indexB === -1) indexB = 999;
                        return indexA - indexB;
                    });

                    return sortedKeys.map(key => {
                        const allItems = groups[key];
                        if (!allItems || allItems.length === 0) return null;
                        
                        // Local filter logic for specific store sliders
                        const subCats = homeItemCats.filter(c => c.parent === key) || [];
                        const selectedSubCat = selectedSubCats[key] || "All";
                        
                        const filteredItems = selectedSubCat === "All" 
                            ? allItems 
                            : allItems.filter(item => {
                                const prodCat = item.category || item.itemCategory;
                                return prodCat === selectedSubCat;
                            });

                        return (
                            <React.Fragment key={key}>
                                <HorizontalSlider 
                                    title={`${key} Items`} 
                                    icon="fa-box" 
                                    data={filteredItems.slice(0, Math.min(itemsLimit, 100))} 
                                    viewAllLink={`/shop-items?category=${encodeURIComponent(key)}`}
                                    rows={2}
                                >
                                    {subCats.length > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            overflowX: 'auto',
                                            scrollbarWidth: 'none',
                                            paddingBottom: '12px',
                                            marginBottom: '4px'
                                        }} className="hide-scrollbar">
                                            <button
                                                onClick={() => setSelectedSubCats(prev => ({ ...prev, [key]: "All" }))}
                                                style={{
                                                    padding: '5px 14px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    whiteSpace: 'nowrap',
                                                    border: '1.5px solid',
                                                    borderColor: selectedSubCat === "All" ? COLORS.PRIMARY : '#E5E7EB',
                                                    background: selectedSubCat === "All" ? COLORS.PRIMARY : 'transparent',
                                                    color: selectedSubCat === "All" ? '#FFF' : '#6B7280',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                All
                                            </button>
                                            {subCats.map(cat => (
                                                <button
                                                    key={cat.name}
                                                    onClick={() => setSelectedSubCats(prev => ({ ...prev, [key]: cat.name }))}
                                                    style={{
                                                        padding: '5px 14px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        whiteSpace: 'nowrap',
                                                        border: '1.5px solid',
                                                        borderColor: selectedSubCat === cat.name ? COLORS.PRIMARY : '#E5E7EB',
                                                        background: selectedSubCat === cat.name ? COLORS.PRIMARY : 'transparent',
                                                        color: selectedSubCat === cat.name ? '#FFF' : '#6B7280',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </HorizontalSlider>
                                {filteredItems.length > 100 && itemsLimit > 100 && (
                                    <HorizontalSlider 
                                        title={`More ${key} Items`} 
                                        icon="fa-plus" 
                                        data={filteredItems.slice(100, itemsLimit)} 
                                        viewAllLink={`/shop-items?category=${encodeURIComponent(key)}`}
                                        rows={2}
                                    />
                                )}
                            </React.Fragment>
                        );
                    });
                })()}
            </section>

            {/* All non-shop service sliders removed from Shopping tab */}

            <div data-section-id="shops" style={{ minHeight: '300px' }}>
                {loadedSections['shops'] && (
                    <HorizontalSlider 
                        title="Shops Nearby" 
                        image="/images/localshops.jpg" 
                        data={getSliderData(discoveryData?.shops)} 
                        viewAllLink={getRouteForCategory('Shops')}
                    />
                )}
            </div>


            {/* 0. Hero with Professional Branding (moved to bottom) */}
            <HeroSection />

            {/* Bottom: Browse by Category */}
            <section style={{ padding: '24px 20px', background: '#1E3A8A' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', textAlign: 'center' }}>
                    Browse by Category
                </p>
                <div
                    className="hide-scrollbar"
                    style={{
                        display: 'flex',
                        gap: '10px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {['DJ/Events', 'Medical', 'Grocery', 'Repair', 'Agriculture', 'Catering', 'Vehicles', 'Decoration'].map((cat, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                window.location.href = getRouteForCategory(cat);
                            }}
                            style={{
                                flexShrink: 0,
                                background: 'rgba(255,255,255,0.12)',
                                padding: '10px 20px',
                                borderRadius: '99px',
                                fontSize: '14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#FFF',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                        >
                            {cat}
                        </div>
                    ))}
                </div>
            </section>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '80px 20px', minHeight: '50vh' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: COLORS.PRIMARY, marginBottom: '8px' }}>
                        {activeService} Coming Soon
                    </h3>
                    <p style={{ color: '#6B7280', fontSize: '15px' }}>
                        We are working hard to bring you the best {activeService} experience. Stay tuned!
                    </p>
                </div>
            )}

            {/* Footer Trust Section */}
            <section style={{ 
                padding: '48px 24px', 
                background: COLORS.PRIMARY, 
                color: '#FFF',
                textAlign: 'center',
                marginTop: '40px'
            }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>
                    Trusted Local Marketplace
                </h3>
                <p style={{ fontSize: '14px', opacity: '0.8', maxWidth: '400px', margin: '0 auto 24px auto' }}>
                    Perfectly Assured Service and Rentals. Verified local partners for your daily needs.
                </p>
                <button 
                    onClick={() => window.location.href = '/help'}
                    style={{
                        background: '#FFF',
                        color: COLORS.PRIMARY,
                        border: 'none',
                        padding: '10px 24px',
                        borderRadius: '99px',
                        fontSize: '14px',
                        fontWeight: '700'
                    }}
                >
                    Get Help
                </button>
            </section>
        </div>
    );
};

export default HomePage;

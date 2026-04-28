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
            setTimeout(() => {
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
                    { timeout: 10000 }
                );
            }, 5000);
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

            {/* Category Modal (Bottom Sheet) */}
            {isCatModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex',
                    alignItems: 'flex-end', justifyContent: 'center'
                }} onClick={() => setIsCatModalOpen(false)}>
                    <div style={{
                        background: '#FFF', width: '100%', maxWidth: '500px',
                        borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
                        padding: '24px', maxHeight: '80vh', overflowY: 'auto'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: COLORS.PRIMARY }}>All Categories</h3>
                            <i className="fa-solid fa-xmark" style={{ cursor: 'pointer', fontSize: '20px', color: '#6B7280' }} onClick={() => setIsCatModalOpen(false)}></i>
                        </div>
                        
                        {Object.entries(
                            homeItemCats.reduce((acc, cat) => {
                                if (cat.name === "All") return acc;
                                if (!acc[cat.parent]) acc[cat.parent] = [];
                                acc[cat.parent].push(cat);
                                return acc;
                            }, {})
                        ).map(([parentName, childCats]) => (
                            <div key={parentName} style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>{parentName}</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {childCats.map(cat => (
                                        <div
                                            key={cat.name}
                                            onClick={() => { setSelectedItemCat(cat.name); setIsCatModalOpen(false); }}
                                            style={{
                                                padding: '8px 16px', borderRadius: '12px', fontSize: '13px',
                                                fontWeight: '600', cursor: 'pointer',
                                                background: selectedItemCat === cat.name ? COLORS.PRIMARY : '#F3F4F6',
                                                color: selectedItemCat === cat.name ? '#FFF' : '#374151',
                                                border: `1px solid ${selectedItemCat === cat.name ? COLORS.PRIMARY : '#E5E7EB'}`,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {cat.icon && <span style={{ marginRight: '6px' }}>{cat.icon}</span>}
                                            {cat.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Featured Items with Category Filter */}
            <section style={{ background: COLORS.BG, paddingTop: '16px' }}>
                <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    overflowX: 'auto', 
                    padding: '0 20px', 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    paddingBottom: '16px'
                }} className="hide-scrollbar">
                    {/* Only show the top 12 most popular categories in the highlight slider */}
                    {homeItemCats.slice(0, 12).map(cat => (
                        <div
                            key={cat.name}
                            onClick={() => setSelectedItemCat(cat.name)}
                            style={{
                                flexShrink: 0,
                                padding: '8px 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                background: selectedItemCat === cat.name ? COLORS.PRIMARY : '#FFF',
                                color: selectedItemCat === cat.name ? '#FFF' : '#374151',
                                border: `1px solid ${selectedItemCat === cat.name ? COLORS.PRIMARY : '#E5E7EB'}`,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {cat.icon && <span>{cat.icon}</span>}
                            {cat.name}
                        </div>
                    ))}
                    
                    {homeItemCats.length > 12 && (
                        <div
                            onClick={() => setIsCatModalOpen(true)}
                            style={{
                                flexShrink: 0, padding: '8px 16px', borderRadius: '12px', fontSize: '13px',
                                fontWeight: '800', cursor: 'pointer', background: '#FFF', color: COLORS.PRIMARY,
                                border: `1px solid ${COLORS.PRIMARY}`, display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <i className="fa-solid fa-layer-group"></i> More
                        </div>
                    )}
                </div>
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
                        const items = groups[key];
                        if (!items || items.length === 0) return null;
                        
                        return (
                            <React.Fragment key={key}>
                                <HorizontalSlider 
                                    title={`${key} Items`} 
                                    icon="fa-box" 
                                    data={items.slice(0, Math.min(itemsLimit, 100))} 
                                    viewAllLink={`/shop-items?category=${encodeURIComponent(key)}`}
                                    rows={2}
                                />
                                {items.length > 100 && itemsLimit > 100 && (
                                    <HorizontalSlider 
                                        title={`More ${key} Items`} 
                                        icon="fa-plus" 
                                        data={items.slice(100, itemsLimit)} 
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

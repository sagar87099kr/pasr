import React, { useState, useEffect } from 'react';
import HeroSection from '../components/home/HeroSection';
import CartSection from '../components/home/CartSection';
import HorizontalSlider from '../components/home/HorizontalSlider';
import ServiceCard from '../components/home/ServiceCard';
import OffersSection from '../components/home/OffersSection';
import { getRecentlyViewed } from '../utils/tracking';
import { getRouteForCategory } from '../utils/routes';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    BG: '#F9FAFB'          // Off-White
};

// Mock data removed to ensure only verified items from the database are shown.

const HomePage = ({ isLoggedIn, initialLat, initialLon, initialBazaarName }) => {
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
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadedSections, setLoadedSections] = useState({}); // Track which sections are scrolled into view

    useEffect(() => {
        setPage(1); // Reset page on category change
    }, [selectedItemCat]);

    useEffect(() => {
        if (!userLoc.resolved) return;

        const fetchHomeItems = async () => {
            try {
                let url = `/api/home/items?page=${page}&limit=20&`;
                if (userLoc.lat && userLoc.lon) {
                    url += `lat=${userLoc.lat}&lon=${userLoc.lon}&`;
                }
                if (selectedItemCat !== "All") {
                    url += `category=${encodeURIComponent(selectedItemCat)}`;
                }

                const response = await fetch(url);
                const result = await response.json();
                if (result && result.items) {
                    if (page === 1) {
                        setHomeItems(result.items);
                    } else {
                        setHomeItems(prev => [...prev, ...result.items]);
                    }
                    setHasMore(result.hasMore);
                    if (result.categories) {
                        setHomeItemCats(result.categories);
                    }
                } else if (Array.isArray(result)) {
                    if (page === 1) {
                        setHomeItems(result);
                    } else {
                        setHomeItems(prev => [...prev, ...result]);
                    }
                    setHasMore(false);
                }
            } catch (err) {
                console.error("Home items fetch failed:", err);
            }
        };
        fetchHomeItems();
    }, [userLoc, selectedItemCat, page]);
    
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

    const [bazaars, setBazaars] = useState([]);
    const [bazaarQuery, setBazaarQuery] = useState('');

    useEffect(() => {
        if (!initialBazaarName) {
            fetch('/api/bazaars')
                .then(r => r.json())
                .then(data => {
                    if (data.success) setBazaars(data.bazaars);
                })
                .catch(e => console.error(e));
        }
    }, [initialBazaarName]);

    const handleSelectBazaar = async (bazaarId) => {
        try {
            const res = await fetch('/api/bazaars/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bazaarId })
            });
            if (res.ok) window.location.reload();
        } catch (e) {
            console.error('Failed to select bazaar', e);
        }
    };

    if (!initialBazaarName || initialBazaarName === 'All Bazaars') {
        const filteredBazaars = bazaars.filter(b => b.name.toLowerCase().includes(bazaarQuery.toLowerCase()));
        
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: COLORS.BG, padding: '40px 20px' }}>
                <div style={{ background: '#FFF', padding: '32px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', maxWidth: '500px', width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <i className="fa-solid fa-map-location-dot" style={{ fontSize: '48px', color: COLORS.PRIMARY, marginBottom: '16px' }}></i>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>Select Your Local Bazaar</h1>
                        <p style={{ color: '#64748B', fontSize: '15px' }}>To discover shops, farmers, and services near you, please select your local marketplace.</p>
                    </div>

                    <div style={{ position: 'relative', marginBottom: '24px' }}>
                        <input 
                            type="text" 
                            placeholder="Search your bazaar..." 
                            value={bazaarQuery}
                            onChange={(e) => setBazaarQuery(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '14px 16px 14px 48px', 
                                borderRadius: '99px', 
                                border: '1px solid #CBD5E1',
                                fontSize: '16px',
                                outline: 'none'
                            }} 
                        />
                        <i className="fa-solid fa-search" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}></i>
                    </div>

                    <div style={{ maxHeight: '350px', overflowY: 'auto', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                        {filteredBazaars.length > 0 ? filteredBazaars.map(b => (
                            <div 
                                key={b._id} 
                                onClick={() => handleSelectBazaar(b._id)}
                                style={{
                                    padding: '16px',
                                    borderBottom: '1px solid #F1F5F9',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'background 0.2s',
                                    background: '#FFF'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
                                onMouseOut={e => e.currentTarget.style.background = '#FFF'}
                            >
                                <div style={{ background: '#EFF6FF', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                                    <i className="fa-solid fa-store" style={{ color: COLORS.PRIMARY }}></i>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0 }}>{b.name}</h3>
                                    <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>{b.location}</p>
                                </div>
                            </div>
                        )) : (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                                No bazaars found matching "{bazaarQuery}".
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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

            {/* NEW LAYOUT: Shops, Categories, Products */}
            {(() => {
                const noShops = !discoveryData?.shops || discoveryData.shops.length === 0;
                const noProducts = !homeItems || homeItems.length === 0;
                
                if (noShops && noProducts && !isLoading) {
                    return (
                        <div style={{ padding: '80px 32px', textAlign: 'center', background: COLORS.BG }}>
                            <i className="fa-solid fa-store-slash" style={{ fontSize: '80px', color: '#CBD5E1', marginBottom: '24px' }}></i>
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: COLORS.PRIMARY, marginBottom: '12px' }}>We will reach you soon!</h2>
                            <p style={{ fontSize: '16px', color: '#64748B' }}>Currently, there are no products or shops available in this bazaar.</p>
                        </div>
                    );
                }

                const ALL_CATEGORIES = [
                    "All", "Fashion", "Mobile Shop", "Electronics", "Footwear", "Grocery", "General Store", 
                    "Bakery", "Restaurant", "Vegetables & Fruits", "Medical", "Beauty/Cosmetics", 
                    "Hardware", "Sweet Shop", "Jewelers", "Furniture", "Dhaba", "Non-Veg", 
                    "Printing & Digital", "Salon", "Seeds & Fertilizers", "Sports", "Stationery", "Others"
                ];

                return (
                    <div style={{ background: COLORS.BG }}>
                        {/* Top: Shops Nearby */}
                        {!noShops && (
                            <HorizontalSlider 
                                title="Shops Nearby" 
                                image="/images/localshops.jpg" 
                                data={getSliderData(discoveryData?.shops)} 
                                viewAllLink={getRouteForCategory('Shops')}
                            />
                        )}

                        {/* Middle: Popular Categories */}
                        <section style={{ padding: '20px 20px 10px 20px', borderBottom: '1px solid #E2E8F0' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>Shop by Category</h3>
                            <div style={{
                                display: 'flex',
                                gap: '10px',
                                overflowX: 'auto',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                paddingBottom: '10px'
                            }} className="hide-scrollbar">
                                {ALL_CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedItemCat(cat)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '99px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            whiteSpace: 'nowrap',
                                            border: '1px solid',
                                            borderColor: selectedItemCat === cat ? COLORS.PRIMARY : '#E5E7EB',
                                            background: selectedItemCat === cat ? COLORS.PRIMARY : '#FFF',
                                            color: selectedItemCat === cat ? '#FFF' : '#374151',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: selectedItemCat === cat ? '0 4px 10px rgba(30, 58, 138, 0.2)' : 'none'
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Bottom: Vertical Product Grid */}
                        <section style={{ padding: '24px 20px' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                gap: '16px'
                            }}>
                                {homeItems.length > 0 ? (
                                    homeItems.map((item, idx) => (
                                        <ServiceCard key={idx} item={item} />
                                    ))
                                ) : (
                                    <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: '#6B7280' }}>
                                        <i className="fa-solid fa-box-open" style={{ fontSize: '32px', marginBottom: '12px', color: '#CBD5E1' }}></i>
                                        <p>No products found for this category.</p>
                                    </div>
                                )}
                            </div>
                            {hasMore && (
                                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                    <button 
                                        onClick={() => setPage(prev => prev + 1)}
                                        style={{
                                            padding: '10px 24px',
                                            borderRadius: '99px',
                                            background: '#FFF',
                                            border: `1px solid ${COLORS.PRIMARY}`,
                                            color: COLORS.PRIMARY,
                                            fontWeight: '700',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Load More
                                    </button>
                                </div>
                            )}
                        </section>
                    </div>
                );
            })()}


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
                    {['DJ/Events', 'Medical', 'Grocery', 'Repair', 'Agriculture', 'Catering', 'Vehicles', 'Decoration', 'Labour & Mistry'].map((cat, idx) => (
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
                    PASR Private Limited. Verified local partners for your daily needs.
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

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

const HomePage = ({ isLoggedIn }) => {
    const [recentItems, setRecentItems] = useState([]);
    const [discoveryData, setDiscoveryData] = useState(null);
    const [homeItems, setHomeItems] = useState([]);
    const [homeItemCats, setHomeItemCats] = useState([{ name: "All", parent: "General" }]);
    const [selectedItemCat, setSelectedItemCat] = useState("All");
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [userLoc, setUserLoc] = useState({ lat: null, lon: null, resolved: false });
    const [isLoading, setIsLoading] = useState(true);

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

        // Try to get browser location
        if ("geolocation" in navigator) {
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
            {/* Special Offers Section */}
            <OffersSection isLoggedIn={isLoggedIn} />


            {/* NEW: Continue Shopping (Cart Items) */}
            {discoveryData?.cartItems?.length > 0 && (
                <CartSection items={discoveryData.cartItems} />
            )}
            
            {/* 1. Recently Viewed (CONDITIONAL) */}
            {recentItems.length > 0 && (
                <HorizontalSlider 
                    title="Recently Viewed" 
                    icon="fa-clock-rotate-left" 
                    data={recentItems} 
                    viewAllLink="/user"
                />
            )}

            <HorizontalSlider 
                title={discoveryData ? "Top Selling Near You" : "Most Sold in Your Area"} 
                icon="fa-fire" 
                data={getSliderData(discoveryData?.bazaar)} 
                viewAllLink={getRouteForCategory('Local Bazaar')}
                rows={2}
            />

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
                <HorizontalSlider 
                    title="Featured Items" 
                    icon="fa-star" 
                    data={getSliderData(homeItems)} 
                    viewAllLink="/shop-items"
                    rows={2}
                />
            </section>

            {/* 3. Local Shops */}
            <HorizontalSlider 
                title="Shops Nearby" 
                image="/images/localshops.jpg" 
                data={getSliderData(discoveryData?.shops)} 
                viewAllLink={getRouteForCategory('Shops')}
            />

            <HorizontalSlider 
                title="Local Bazaar Products" 
                image="/images/localMarket.jpg" 
                data={getSliderData(discoveryData?.bazaar)} 
                viewAllLink={getRouteForCategory('Local Bazaar')}
                rows={2}
            />

            {/* 5. Farming & Agriculture */}
            <HorizontalSlider 
                title="Farming & Agriculture" 
                image="/images/keshanSabha.png" 
                data={getSliderData(discoveryData?.farming)} 
                viewAllLink={getRouteForCategory('Farming Vehicles')}
            />

            {/* 6. Four Wheelers & Transport */}
            <HorizontalSlider 
                title="Four Wheelers & Transport" 
                icon="fa-truck-moving" 
                data={getSliderData(discoveryData?.vehicles)} 
                viewAllLink={getRouteForCategory('Four Wheelers')}
            />

            {/* 7. Three Wheelers */}
            <HorizontalSlider 
                title="Three Wheelers" 
                icon="fa-car-side" 
                data={getSliderData(discoveryData?.threeWheelers, [])} 
                viewAllLink="/three-weelers"
            />

            {/* 8. Caterings */}
            <HorizontalSlider 
                title="Catering Services" 
                icon="fa-utensils" 
                data={getSliderData(discoveryData?.catering)} 
                viewAllLink="/caterings"
            />

            {/* 9. Filming and Photography */}
            <HorizontalSlider 
                title="Filming and Photography" 
                icon="fa-camera" 
                data={getSliderData(discoveryData?.filming, [])} 
                viewAllLink="/filming"
            />

            {/* 10. Event Decorators */}
            <HorizontalSlider 
                title="Event Decorators" 
                icon="fa-wand-magic-sparkles" 
                data={getSliderData(discoveryData?.decoration, [])} 
                viewAllLink="/decor"
            />

            {/* 11. Band Party */}
            <HorizontalSlider 
                title="Band Party" 
                icon="fa-drum" 
                data={getSliderData(discoveryData?.bandParty, [])} 
                viewAllLink="/bandparty"
            />

            {/* NEW: 11b. DJ and Tent */}
            <HorizontalSlider 
                title="DJ and Tent" 
                icon="fa-music" 
                data={getSliderData(discoveryData?.dj, [])} 
                viewAllLink="/dj"
            />

            {/* 12. Home Service */}
            <HorizontalSlider 
                title="Home Service" 
                icon="fa-house-chimney-crack" 
                data={getSliderData(discoveryData?.homeService, [])} 
                viewAllLink="/homeservice"
            />

            {/* 13. Heavy Equipments */}
            <HorizontalSlider 
                title="Heavy Equipments" 
                icon="fa-tractor" 
                data={getSliderData(discoveryData?.heavyEquipments, [])} 
                viewAllLink="/heavy"
            />


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

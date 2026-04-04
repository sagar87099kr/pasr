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
    const [isLoading, setIsLoading] = useState(true);

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
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
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
                    fetchDiscovery(); // Fallback to session/database location
                },
                { timeout: 10000 }
            );
        } else {
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

            {/* 2. Most Sold / Trending */}
            <HorizontalSlider 
                title={discoveryData ? "Top Selling Near You" : "Most Sold in Your Area"} 
                icon="fa-fire" 
                data={getSliderData(discoveryData?.bazaar)} 
                viewAllLink={getRouteForCategory('Local Bazaar')}
            />

            {/* 3. Local Shops */}
            <HorizontalSlider 
                title="Shops Nearby" 
                image="/images/localshops.jpg" 
                data={getSliderData(discoveryData?.shops)} 
                viewAllLink={getRouteForCategory('Shops')}
            />

            {/* 4. Local Bazaar Products */}
            <HorizontalSlider 
                title="Local Bazaar Products" 
                image="/images/localMarket.jpg" 
                data={getSliderData(discoveryData?.bazaar)} 
                viewAllLink={getRouteForCategory('Local Bazaar')}
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

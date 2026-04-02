import React, { useState, useEffect } from 'react';
import HeroSection from '../components/home/HeroSection';
import CartSection from '../components/home/CartSection';
import HorizontalSlider from '../components/home/HorizontalSlider';
import OffersSection from '../components/home/OffersSection';
import { getRecentlyViewed } from '../utils/tracking';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    BG: '#F9FAFB'          // Off-White
};

// --- Mock Data for Sliders (Using Real Local Image Paths) ---
const MOST_SOLD = [
    { id: 'ts1', productName: 'Fresh Cow Milk', categories: 'Dairy', image: 'https://images.unsplash.com/photo-1550583724-125581cc255b?q=80&w=800&auto=format&fit=crop', price: 60, unit: 'Litre', location: 'Dhanwar' },
    { id: 'ts2', productName: 'Pure Local Ghee', categories: 'Dairy', image: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?q=80&w=800&auto=format&fit=crop', price: 650, unit: 'kg', location: 'Giridih' },
    { id: 'ts3', productName: 'Organic Arhar Dal', categories: 'Grains', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop', price: 120, unit: 'kg', location: 'Jamua' }
];

const SHOPS = [
    { id: 's1', shopName: 'Maa Durga Kirana', category: 'Grocery', image: '/images/localshops.jpg', location: 'Giridih', price: 0, openingTime: '8 AM' },
    { id: 's2', shopName: 'Aman Medicos', category: 'Medical', image: '/images/shop_front_example.png', location: 'Doranda', price: 0, openingTime: '9 AM' },
    { id: 's3', shopName: 'Laxmi General Store', category: 'Grocery', image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?q=80&w=800&auto=format&fit=crop', location: 'Bengabad', price: 0, openingTime: '7 AM' }
];

const BAZAAR = [
    { id: 'b1', productName: 'Fresh Tomatoes', categories: 'Vegetables', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=800&auto=format&fit=crop', price: 40, unit: 'kg', location: 'Giridih' },
    { id: 'b2', productName: 'Local Potatoes', categories: 'Vegetables', image: 'https://images.unsplash.com/photo-1518977676601-b53f02ac6d31?q=80&w=800&auto=format&fit=crop', price: 25, unit: 'kg', location: 'Jamua' },
    { id: 'b3', productName: 'Local Cauliflower', categories: 'Vegetables', image: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ce3?q=80&w=800&auto=format&fit=crop', price: 30, unit: 'kg', location: 'Dhanwar' }
];

const FARMING = [
    { id: 'f1', productName: 'Power Tiller', categories: 'Agriculture', image: '/images/fram tractor.jpeg', price: 1500, unit: 'Day', location: 'Giridih' },
    { id: 'f2', productName: 'Organic Seeds', categories: 'Seeds', image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?q=80&w=800&auto=format&fit=crop', price: 200, unit: 'kg', location: 'Bengabad' },
    { id: 'f3', productName: 'Water Pump Repair', categories: 'Repair', image: '/images/construction.jpg', price: 500, unit: 'Visit', location: 'Jamua' }
];

const VEHICLES = [
    { id: 'v1', name: 'Bolero PickUp', category: 'Vehicles', image: '/images/four wheeler .jpg', price: 2500, location: 'Giridih' },
    { id: 'v2', name: 'Auto Rickshaw', category: 'Vehicles', image: '/images/three-weelers.jpg', price: 1000, location: 'Dhanwar' },
    { id: 'v3', name: 'Local Mini Bus', category: 'Vehicles', image: '/images/bus .jpg', price: 5000, location: 'Jamua' }
];

const CATERING = [
    { id: 'c1', name: 'Standard Catering', category: 'Catering', image: '/images/chef .jpg', price: 250, unit: 'Plate', location: 'Giridih' },
    { id: 'c2', name: 'Party Meal Pack', category: 'Catering', image: 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=800&auto=format&fit=crop', price: 150, unit: 'Plate', location: 'Dhanwar' }
];

const DJ_TENT = [
    { id: 'd1', name: 'High Bass DJ', category: 'DJ', image: '/images/DJ for party.jpeg', price: 5000, location: 'Jamua' },
    { id: 'd2', name: 'Complete Tent Set', category: 'Decoration', image: '/images/decor.jpeg', price: 15000, location: 'Giridih' },
    { id: 'd3', name: 'Band Party', category: 'Music', image: '/images/band party.jpg', price: 8000, location: 'Dhanwar' }
];

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

    // Helper to get data for specific sliders, falling back to mock data if empty
    const getSliderData = (realData, mockFallback) => {
        if (realData && realData.length > 0) return realData;
        return mockFallback;
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
                data={getSliderData(discoveryData?.bazaar, MOST_SOLD)} 
                viewAllLink="/localMarket"
            />

            {/* 3. Local Shops */}
            <HorizontalSlider 
                title="Shops Nearby" 
                image="/images/localshops.jpg" 
                data={getSliderData(discoveryData?.shops, SHOPS)} 
                viewAllLink="/shops"
            />

            {/* 4. Local Bazaar Products */}
            <HorizontalSlider 
                title="Local Bazaar Products" 
                image="/images/localMarket.jpg" 
                data={getSliderData(discoveryData?.bazaar, BAZAAR)} 
                viewAllLink="/localMarket"
            />

            {/* 5. Farming & Agriculture */}
            <HorizontalSlider 
                title="Farming & Agriculture" 
                image="/images/keshanSabha.png" 
                data={getSliderData(discoveryData?.farming, FARMING)} 
                viewAllLink="/categories?type=Agriculture"
            />

            {/* 6. Four Wheelers & Transport */}
            <HorizontalSlider 
                title="Four Wheelers & Transport" 
                icon="fa-truck-moving" 
                data={getSliderData(discoveryData?.vehicles, VEHICLES)} 
                viewAllLink="/categories?type=Vehicles"
            />

            {/* 7. Three Wheelers */}
            <HorizontalSlider 
                title="Three Wheelers" 
                icon="fa-car-side" 
                data={getSliderData(discoveryData?.threeWheelers, [])} 
                viewAllLink="/categories?type=Three Wheelers"
            />

            {/* 8. Caterings */}
            <HorizontalSlider 
                title="Catering Services" 
                icon="fa-utensils" 
                data={getSliderData(discoveryData?.catering, CATERING)} 
                viewAllLink="/categories?type=Caterings"
            />

            {/* 9. Filming and Photography */}
            <HorizontalSlider 
                title="Filming and Photography" 
                icon="fa-camera" 
                data={getSliderData(discoveryData?.filming, [])} 
                viewAllLink="/categories?type=Filming"
            />

            {/* 10. Event Decorators */}
            <HorizontalSlider 
                title="Event Decorators" 
                icon="fa-wand-magic-sparkles" 
                data={getSliderData(discoveryData?.decoration, [])} 
                viewAllLink="/categories?type=Decoration"
            />

            {/* 11. Band Party */}
            <HorizontalSlider 
                title="Band Party" 
                icon="fa-drum" 
                data={getSliderData(discoveryData?.bandParty, [])} 
                viewAllLink="/categories?type=Band Party"
            />

            {/* 12. Home Service */}
            <HorizontalSlider 
                title="Home Service" 
                icon="fa-house-chimney-crack" 
                data={getSliderData(discoveryData?.homeService, [])} 
                viewAllLink="/categories?type=Home Service provider"
            />

            {/* 13. Heavy Equipments */}
            <HorizontalSlider 
                title="Heavy Equipments" 
                icon="fa-tractor" 
                data={getSliderData(discoveryData?.heavyEquipments, [])} 
                viewAllLink="/categories?type=Heavy Equipments"
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
                            onClick={() => window.location.href = `/categories?type=${cat}`}
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

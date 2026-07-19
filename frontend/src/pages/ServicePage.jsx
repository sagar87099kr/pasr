import React, { useState, useEffect } from 'react';
import HeroSection from '../components/home/HeroSection';
import HorizontalSlider from '../components/home/HorizontalSlider';
import OffersSection from '../components/home/OffersSection';
import { getRouteForCategory } from '../utils/routes';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    BG: '#F9FAFB'          // Off-White
};

const ServicePage = ({ isLoggedIn, initialLat, initialLon }) => {
    const [discoveryData, setDiscoveryData] = useState(null);
    const [activeService, setActiveService] = useState('Service');
    const [userLoc, setUserLoc] = useState({ 
        lat: (initialLat && initialLat !== 'undefined') ? parseFloat(initialLat) : null, 
        lon: (initialLon && initialLon !== 'undefined') ? parseFloat(initialLon) : null, 
        resolved: !!(initialLat && initialLat !== 'undefined' && initialLon && initialLon !== 'undefined') 
    });
    const [isLoading, setIsLoading] = useState(true);
    const [loadedSections, setLoadedSections] = useState({});

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
    }, [discoveryData]);

    useEffect(() => {
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

        setUserLoc({ lat: null, lon: null, resolved: true });
        fetchDiscovery();
    }, []);

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
                            if (service.id === 'Service') {
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

            <div style={{ padding: '20px 20px 0 20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: COLORS.PRIMARY, margin: 0 }}>
                    Local Services
                </h2>
                <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                    Verified professionals within 5km of your location.
                </p>
            </div>

            {/* Discovery Sliders with Lazy Loading */}
            <div data-section-id="farming" style={{ minHeight: '300px' }}>
                {loadedSections['farming'] && (
                    <HorizontalSlider 
                        title="Farming & Agriculture" 
                        image="/images/keshanSabha.png" 
                        data={getSliderData(discoveryData?.farming)} 
                        viewAllLink={getRouteForCategory('Farming Vehicles')}
                    />
                )}
            </div>

            <div data-section-id="transport" style={{ minHeight: '300px' }}>
                {loadedSections['transport'] && (
                    <HorizontalSlider 
                        title="Four Wheelers & Transport" 
                        icon="fa-truck-moving" 
                        data={getSliderData(discoveryData?.vehicles)} 
                        viewAllLink={getRouteForCategory('Four Wheelers')}
                    />
                )}
            </div>

            <div data-section-id="3wheelers" style={{ minHeight: '300px' }}>
                {loadedSections['3wheelers'] && (
                    <HorizontalSlider 
                        title="Three Wheelers" 
                        icon="fa-car-side" 
                        data={getSliderData(discoveryData?.threeWheelers, [])} 
                        viewAllLink="/three-weelers"
                    />
                )}
            </div>

            <div data-section-id="catering" style={{ minHeight: '300px' }}>
                {loadedSections['catering'] && (
                    <HorizontalSlider 
                        title="Catering Services" 
                        icon="fa-utensils" 
                        data={getSliderData(discoveryData?.catering)} 
                        viewAllLink="/caterings"
                    />
                )}
            </div>

            <div data-section-id="filming" style={{ minHeight: '300px' }}>
                {loadedSections['filming'] && (
                    <HorizontalSlider 
                        title="Filming and Photography" 
                        icon="fa-camera" 
                        data={getSliderData(discoveryData?.filming, [])} 
                        viewAllLink="/filming"
                    />
                )}
            </div>

            <div data-section-id="decor" style={{ minHeight: '300px' }}>
                {loadedSections['decor'] && (
                    <HorizontalSlider 
                        title="Event Decorators" 
                        icon="fa-wand-magic-sparkles" 
                        data={getSliderData(discoveryData?.decoration, [])} 
                        viewAllLink="/decor"
                    />
                )}
            </div>

            <div data-section-id="band" style={{ minHeight: '300px' }}>
                {loadedSections['band'] && (
                    <HorizontalSlider 
                        title="Band Party" 
                        icon="fa-drum" 
                        data={getSliderData(discoveryData?.bandParty, [])} 
                        viewAllLink="/bandparty"
                    />
                )}
            </div>

            <div data-section-id="dj" style={{ minHeight: '300px' }}>
                {loadedSections['dj'] && (
                    <HorizontalSlider 
                        title="DJ and Tent" 
                        icon="fa-music" 
                        data={getSliderData(discoveryData?.dj, [])} 
                        viewAllLink="/dj"
                    />
                )}
            </div>

            <div data-section-id="homeservice" style={{ minHeight: '300px' }}>
                {loadedSections['homeservice'] && (
                    <HorizontalSlider 
                        title="Home Service" 
                        icon="fa-house-chimney-crack" 
                        data={getSliderData(discoveryData?.homeService, [])} 
                        viewAllLink="/homeservice"
                    />
                )}
            </div>

            <div data-section-id="heavy" style={{ minHeight: '300px' }}>
                {loadedSections['heavy'] && (
                    <HorizontalSlider 
                        title="Heavy Equipments" 
                        icon="fa-tractor" 
                        data={getSliderData(discoveryData?.heavyEquipments, [])} 
                        viewAllLink="/heavy"
                    />
                )}
            </div>

            {/* 0. Hero with Professional Branding */}
            <HeroSection />

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

export default ServicePage;

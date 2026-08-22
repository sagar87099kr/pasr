import React, { useState, useEffect, useRef } from 'react';

const OffersSection = ({ isLoggedIn }) => {
    const [ads, setAds] = useState([]);
    const [selectedAd, setSelectedAd] = useState(null);
    const sliderRef = useRef(null);

    useEffect(() => {
        const fetchAds = async () => {
            try {
                const res = await fetch('/api/advertisements/active');
                const data = await res.json();
                if (data.success && data.advertisements) {
                    setAds(data.advertisements);
                }
            } catch (err) {
                console.error('Error fetching ads', err);
            }
        };
        fetchAds();
    }, []);

    useEffect(() => {
        if (!sliderRef.current) return;
        let index = 0;
        
        const scrollInterval = setInterval(() => {
            const slider = sliderRef.current;
            if (!slider) return;
            
            // Total items = ads + 2 default cards
            const totalItems = ads.length + 2;
            
            index = (index + 1) % totalItems;
            
            // Calculate scroll amount. Width ~400 + 20 gap = 420
            // Instead of exact pixels, we can scroll by the first child's width
            const firstChild = slider.firstElementChild;
            if (firstChild) {
                const scrollAmount = index * (firstChild.offsetWidth + 20);
                slider.scrollTo({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
            }
        }, 5000);

        return () => clearInterval(scrollInterval);
    }, [ads.length]);

    const handleAdClick = (e, ad) => {
        e.preventDefault();
        setSelectedAd(ad);
    };

    const closeAdModal = () => {
        setSelectedAd(null);
    };

    return (
        <section style={{ padding: '24px 20px', maxWidth: '1400px', margin: '0 auto' }}>
            <div 
                ref={sliderRef}
                className="offers-slider" 
                style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: '20px',
                    scrollSnapType: 'x mandatory',
                    paddingBottom: '16px',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {/* Advertisements */}
                {ads.map((ad, idx) => (
                    <div 
                        key={idx} 
                        onClick={(e) => handleAdClick(e, ad)}
                        style={{
                            position: 'relative',
                            borderRadius: '24px',
                            overflow: 'hidden',
                            textDecoration: 'none',
                            color: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            flex: '0 0 auto',
                            width: 'calc(100vw - 60px)',
                            maxWidth: '400px',
                            scrollSnapAlign: 'start',
                            cursor: 'pointer',
                            aspectRatio: '16/9',
                            backgroundColor: '#111'
                        }}
                        className="hover-lift"
                    >
                        <img 
                            src={ad.imageUrl} 
                            alt={ad.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(0,0,0,0.6)',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: 'white'
                        }}>
                            Ad
                        </div>
                    </div>
                ))}

                {/* Refer and Earn Card */}
                <a href={isLoggedIn ? "/user" : "/login"} style={{
                    position: 'relative',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'white',
                    padding: '40px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    flex: '0 0 auto',
                    width: 'calc(100vw - 60px)',
                    maxWidth: '400px',
                    scrollSnapAlign: 'start'
                }}
                className="hover-lift"
                >
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{
                            fontSize: '32px',
                            marginBottom: '20px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            width: '64px',
                            height: '64px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            backdropFilter: 'blur(5px)',
                            color: 'white',
                            lineHeight: 1
                        }}>
                            <i className="fa-solid fa-gift" style={{ color: 'white' }}></i>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 12px', color: 'white', textDecoration: 'none' }}>
                            {isLoggedIn ? "Refer & Get Coins" : "Sign Up & Earn"}
                        </h3>
                        <p style={{ fontSize: '15px', opacity: '0.9', margin: '0 0 24px', lineHeight: '1.6', color: 'white', textDecoration: 'none' }}>
                            {isLoggedIn 
                                ? "Share with your friends and get 10 coins. Use coins to get discounts on products!" 
                                : "Sign up using a referral link and get welcome coins to use on your purchases."}
                        </p>
                        <span style={{
                            display: 'inline-block',
                            background: 'white',
                            color: '#1E3A8A',
                            padding: '8px 20px',
                            borderRadius: '99px',
                            fontWeight: '600',
                            fontSize: '14px',
                            alignSelf: 'flex-start',
                            textDecoration: 'none'
                        }}>
                            {isLoggedIn ? "Share Now" : "Sign Up Now"}
                        </span>
                    </div>
                    {/* Background Effect */}
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-20%',
                        width: '250px',
                        height: '250px',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                        borderRadius: '50%',
                        zIndex: 0
                    }}></div>
                </a>

                {/* Coin Discounts Card */}
                <a href="/shops" style={{
                    position: 'relative',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'white',
                    padding: '40px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    flex: '0 0 auto',
                    width: 'calc(100vw - 60px)',
                    maxWidth: '400px',
                    scrollSnapAlign: 'start'
                }}
                className="hover-lift"
                >
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{
                            fontSize: '32px',
                            marginBottom: '20px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            width: '64px',
                            height: '64px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            backdropFilter: 'blur(5px)',
                            color: 'white',
                            lineHeight: 1
                        }}>
                            <i className="fa-solid fa-coins" style={{ color: 'white' }}></i>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 12px', color: 'white', textDecoration: 'none' }}>Use Coin Discounts</h3>
                        <p style={{ fontSize: '15px', opacity: '0.9', margin: '0 0 24px', lineHeight: '1.6', color: 'white', textDecoration: 'none' }}>
                            Apply your earned wallet coins during checkout to get amazing discounts on products and rentals. Save more!
                        </p>
                        <span style={{
                            display: 'inline-block',
                            background: 'white',
                            color: '#b91c1c',
                            padding: '8px 20px',
                            borderRadius: '99px',
                            fontWeight: '600',
                            fontSize: '14px',
                            alignSelf: 'flex-start',
                            textDecoration: 'none'
                        }}>Save Money</span>
                    </div>
                    {/* Background Effect */}
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-20%',
                        width: '250px',
                        height: '250px',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                        borderRadius: '50%',
                        zIndex: 0
                    }}></div>
                </a>
            </div>

            {/* Ad Full Screen Modal */}
            {selectedAd && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                }}>
                    <button 
                        onClick={closeAdModal}
                        style={{
                            position: 'absolute',
                            top: '30px',
                            right: '30px',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '30px',
                            cursor: 'pointer'
                        }}
                    >
                        &times;
                    </button>
                    
                    <img 
                        src={selectedAd.imageUrl} 
                        alt="Advertisement" 
                        style={{
                            maxWidth: '90%',
                            maxHeight: '75vh',
                            objectFit: 'contain',
                            borderRadius: '8px'
                        }}
                    />

                    <div style={{ marginTop: '30px', display: 'flex', gap: '20px' }}>
                        {selectedAd.link && (
                            <a 
                                href={selectedAd.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#4f46e5',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <i className="fa-solid fa-arrow-up-right-from-square"></i> Visit Link
                            </a>
                        )}
                        {selectedAd.phoneNumber && (
                            <a 
                                href={`tel:${selectedAd.phoneNumber}`}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#16a34a',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <i className="fa-solid fa-phone"></i> Call Now
                            </a>
                        )}
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                .hover-lift:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1) !important;
                }
                .offers-slider::-webkit-scrollbar {
                    display: none;
                }
            `}} />
        </section>
    );
};

export default OffersSection;

import React from 'react';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    SECONDARY: '#F97316',  // Orange
    SURFACE: '#FFFFFF'     // White
};

const HeroSection = () => {
    return (
        <section className="hero-section" style={{
            background: COLORS.PRIMARY,
            padding: '40px 20px',
            color: '#FFF',
            borderBottom: `4px solid ${COLORS.SECONDARY}`
        }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {/* Simplified High-Contrast Headline */}
                <h1 style={{ 
                    fontSize: '28px', 
                    fontWeight: '800', 
                    marginBottom: '8px',
                    lineHeight: '1.2',
                    textAlign: 'center'
                }}>
                    PASR: Local Marketplace for You
                </h1>
                <p style={{ 
                    fontSize: '16px', 
                    opacity: '0.9', 
                    marginBottom: '32px',
                    textAlign: 'center' 
                }}>
                    Buy Daily Essentials & Book Services Instantly
                </p>

                {/* Major Service Actions - Professional Buttons with Local Imagery */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                    marginBottom: '32px'
                }}>
                    <div 
                        onClick={() => window.location.href = '/localMarket'}
                        style={{
                            background: COLORS.SECONDARY,
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <img 
                            src="/images/localMarket.jpg" 
                            alt="Bazaar" 
                            style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }}
                        />
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: '800' }}>Local Bazaar</div>
                            <div style={{ fontSize: '12px', opacity: '0.9' }}>Buy fresh farm products</div>
                        </div>
                        <i className="fa-solid fa-chevron-right" style={{ marginLeft: 'auto', opacity: '0.7' }}></i>
                    </div>

                    <div 
                        onClick={() => window.location.href = '/shops'}
                        style={{
                            background: COLORS.SURFACE,
                            color: COLORS.PRIMARY,
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #E2E8F0'
                        }}
                    >
                        <img 
                            src="/images/localshops.jpg" 
                            alt="Shops" 
                            style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '2px solid rgba(30, 58, 138, 0.1)' }}
                        />
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: '800' }}>Shop Nearby</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Order from local Kirana</div>
                        </div>
                        <i className="fa-solid fa-chevron-right" style={{ marginLeft: 'auto', color: '#94a3b8' }}></i>
                    </div>

                    <div 
                        onClick={() => window.location.href = '/kisan-sabha'}
                        style={{
                            background: '#16A34A', // Success Green
                            color: '#FFF',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(22, 163, 74, 0.2)'
                        }}
                    >
                        <img 
                            src="/images/keshanSabha.png" 
                            alt="Kisan Sabha" 
                            style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)', background: '#FFF' }}
                        />
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: '800' }}>Kisan Sabha</div>
                            <div style={{ fontSize: '12px', opacity: '0.9' }}>Connect with local farmers</div>
                        </div>
                        <i className="fa-solid fa-chevron-right" style={{ marginLeft: 'auto', opacity: '0.7' }}></i>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default HeroSection;

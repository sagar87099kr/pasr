import React from 'react';
import ServiceCard from './ServiceCard';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    TEXT_PRI: '#111827',   // Dark Grey
    BG: '#F9FAFB'          // Off-White
};

const HorizontalSlider = ({ title, icon, image, data, viewAllLink }) => {
    if (!data || data.length === 0) return null;

    return (
        <section className="section" style={{ padding: '24px 20px', background: COLORS.BG, borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {image ? (
                        <img 
                            src={image} 
                            alt={title} 
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #E2E8F0' }}
                        />
                    ) : (
                        icon && <i className={`fa-solid ${icon}`} style={{ fontSize: '20px', color: COLORS.PRIMARY }}></i>
                    )}
                    <h2 style={{ 
                        fontSize: '18px', 
                        fontWeight: '800', 
                        margin: 0,
                        color: COLORS.TEXT_PRI,
                    }}>
                        {title}
                    </h2>
                </div>
                {viewAllLink && (
                    <span 
                        onClick={() => window.location.href = viewAllLink}
                        style={{ fontSize: '13px', color: COLORS.PRIMARY, fontWeight: '700', cursor: 'pointer' }}
                    >
                        View All
                    </span>
                )}
            </div>
            
            <div style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
            }} className="hide-scrollbar">
                {data.map((item, idx) => (
                    <div key={idx} style={{ minWidth: '160px', maxWidth: '160px' }}>
                        <ServiceCard item={item} />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default HorizontalSlider;

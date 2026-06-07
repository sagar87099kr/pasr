import React from 'react';
import ServiceCard from './ServiceCard';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    TEXT_PRI: '#111827',   // Dark Grey
    BG: '#F9FAFB'          // Off-White
};

const HorizontalSlider = ({ title, icon, image, data, viewAllLink, rows = 1, children }) => {
    if ((!data || data.length === 0) && !children) return null;

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
            
            {children}

            {data && data.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateRows: rows > 1 ? `repeat(${rows}, auto)` : 'none',
                    gridAutoFlow: 'column',
                    gap: '16px',
                    overflowX: 'auto',
                    paddingBottom: '12px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                }} className="hide-scrollbar">
                    {data.map((item, idx) => (
                        <div key={idx} style={{ 
                            minWidth: rows > 1 ? '160px' : '180px', 
                            maxWidth: rows > 1 ? '160px' : '180px' 
                        }}>
                            <ServiceCard item={item} />
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#6B7280', fontSize: '14px', fontStyle: 'italic' }}>
                    No items available for this filter.
                </div>
            )}
        </section>
    );
};

export default HorizontalSlider;

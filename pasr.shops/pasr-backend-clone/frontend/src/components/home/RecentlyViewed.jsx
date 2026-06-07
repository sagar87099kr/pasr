import React from 'react';
import ServiceCard from './ServiceCard';

const RecentlyViewed = ({ items }) => {
    if (!items || items.length === 0) return null;

    return (
        <section className="section" style={{ padding: '24px 20px' }}>
            <h2 style={{ 
                fontSize: '18px', 
                fontWeight: '800', 
                margin: '0 0 16px 0',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: '#6366f1' }}></i>
                Recently Viewed
            </h2>
            <div style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }} className="horizontal-scroll">
                {items.map((item, idx) => (
                    <div key={idx} style={{ minWidth: '160px', maxWidth: '160px' }}>
                        <ServiceCard item={item} />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default RecentlyViewed;

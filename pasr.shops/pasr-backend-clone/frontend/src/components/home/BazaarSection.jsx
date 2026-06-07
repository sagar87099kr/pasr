import React from 'react';
import ServiceCard from './ServiceCard';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    TEXT_PRI: '#111827',   // Dark Grey
    TEXT_SEC: '#6B7280',   // Light Grey
    BG: '#F9FAFB'          // Off-White
};

const BAZAAR_DATA = [
    { id: 'b1', productName: 'Fresh Cow Milk', categories: 'Dairy', image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/milk1.jpg', price: 60, unit: 'Litre', location: 'Dhanwar' },
    { id: 'b2', productName: 'Organic Arhar Dal', categories: 'Grains', image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/dal1.jpg', price: 120, unit: 'kg', location: 'Jamua' },
    { id: 'b3', productName: 'Bazaar Tomatoes', categories: 'Vegetables', image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/tomato1.jpg', price: 40, unit: 'kg', location: 'Giridih' },
    { id: 'b4', productName: 'Local Honey', categories: 'Grocery', image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/honey1.jpg', price: 350, unit: 'kg', location: 'Bengabad' }
];

const BazaarSection = () => {
    return (
        <section className="section" style={{ padding: '32px 20px', background: COLORS.BG }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                        src="/images/localMarket.jpg" 
                        alt="Market" 
                        style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #E2E8F0' }}
                    />
                    <h2 style={{ 
                        fontSize: '20px', 
                        fontWeight: '800', 
                        margin: 0,
                        color: COLORS.TEXT_PRI,
                    }}>
                        Fresh in Bazaar
                    </h2>
                </div>
                <span 
                    onClick={() => window.location.href = '/localMarket'}
                    style={{ fontSize: '13px', color: COLORS.PRIMARY, fontWeight: '700', cursor: 'pointer' }}
                >
                    View All
                </span>
            </div>
            
            <div style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                paddingBottom: '12px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }} className="horizontal-scroll">
                {BAZAAR_DATA.map((item, idx) => (
                    <div key={idx} style={{ minWidth: '160px', maxWidth: '160px' }}>
                        <ServiceCard item={item} />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default BazaarSection;
export { BAZAAR_DATA };

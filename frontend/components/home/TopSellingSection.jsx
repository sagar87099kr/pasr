import React from 'react';
import ServiceCard from './ServiceCard';

const TOP_SELLING_DATA = [
    { 
        id: '699c2ca9158ff731545cceb9', 
        productName: 'Chauki dubbed bed', 
        categories: 'Furniture', 
        image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/furniture1.jpg', 
        price: 4500, 
        unit: 'piece', 
        location: 'Dhanwar',
        isBestSeller: true 
    },
    { 
        id: '699c2ca9158ff731545cceb9', 
        productName: 'Fresh Cow Milk', 
        categories: 'Dairy', 
        image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/milk1.jpg', 
        price: 60, 
        unit: 'Litre', 
        location: 'Dhanwar',
        isBestSeller: true 
    },
    { 
        id: '699c2ca9158ff731545cceb9', 
        productName: 'Pure Local Ghee', 
        categories: 'Dairy', 
        image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/ghee1.jpg', 
        price: 650, 
        unit: 'kg', 
        location: 'Giridih',
        isBestSeller: true
    },
    { 
        id: '699c2ca9158ff731545cceb9', 
        productName: 'Organic Arhar Dal', 
        categories: 'Grains', 
        image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/dal1.jpg', 
        price: 120, 
        unit: 'kg', 
        location: 'Jamua' 
    }
];

const TopSellingSection = () => {
    return (
        <section className="section" style={{ padding: '24px 20px', background: '#FFF', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <img 
                    src="/images/localshops.jpg" 
                    alt="Shops" 
                    style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #E2E8F0' }}
                />
                <h2 style={{ 
                    fontSize: '18px', 
                    fontWeight: '800', 
                    margin: 0,
                    color: '#1e293b',
                }}>
                    Most Sold in Your Locality
                </h2>
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
                {TOP_SELLING_DATA.map((item, idx) => (
                    <div key={idx} style={{ minWidth: '150px', maxWidth: '150px' }}>
                        <ServiceCard item={item} />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default TopSellingSection;

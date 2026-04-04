import React from 'react';
import ServiceCard from './ServiceCard';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    TEXT_PRI: '#111827',   // Dark Grey
    BG: '#F9FAFB'          // Off-White
};

const POPULAR_DATA = [
    { id: '1', shopName: 'Maa Durga Kirana Store', category: 'Grocery', image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/shop1.jpg', location: 'Giridih', price: 0 },
    { id: '2', productName: 'Pure Cow Ghee', categories: 'Dairy', image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/ghee1.jpg', price: 650, quantity: 1, unit: 'kg', location: 'Rajdhanwar' },
    { id: '3', name: 'RK DJ & Sound', category: 'DJ', image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/dj1.jpg', location: 'Jamua', price: 5000 },
    { id: '4', shopName: 'Aman Medicos', category: 'Medical', image: 'https://res.cloudinary.com/dbv5unsc6/image/upload/v1710500000/pasr/med1.jpg', location: 'Doranda', price: 0 }
];

const PopularNearYou = () => {
    return (
        <section className="section" style={{ padding: '32px 20px', background: COLORS.BG }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '20px'
            }}>
                <h2 style={{ 
                    fontSize: '20px', 
                    fontWeight: '800', 
                    margin: 0,
                    color: COLORS.TEXT_PRI,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <i className="fa-solid fa-map-location-dot" style={{ color: COLORS.PRIMARY }}></i>
                    Popular Near You
                </h2>
                <span 
                    onClick={() => window.location.href = '/localMarket'}
                    style={{ fontSize: '13px', color: COLORS.PRIMARY, fontWeight: '700', cursor: 'pointer' }}
                >
                    View All
                </span>
            </div>
            
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
            }}>
                {POPULAR_DATA.map((item, idx) => (
                    <ServiceCard key={idx} item={item} />
                ))}
            </div>
        </section>
    );
};

export default PopularNearYou;
export { POPULAR_DATA };

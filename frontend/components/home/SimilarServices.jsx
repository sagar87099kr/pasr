import React from 'react';
import ServiceCard from './ServiceCard';

const SimilarServices = ({ category, allServices }) => {
    if (!category || !allServices) return null;

    // Logic: Filter services by the same category, excluding the last viewed one ideally (not implemented here for simplicity)
    const similar = allServices.filter(s => s.category === category).slice(0, 4);

    if (similar.length === 0) return null;

    return (
        <section className="section" style={{ padding: '24px 20px', background: '#f8fafc' }}>
            <h2 style={{ 
                fontSize: '18px', 
                fontWeight: '800', 
                margin: '0 0 4px 0',
                color: '#1e293b'
            }}>
                More Like This
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Recommended for you</p>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px'
            }}>
                {similar.map((item, idx) => (
                    <ServiceCard key={idx} item={item} />
                ))}
            </div>
        </section>
    );
};

export default SimilarServices;

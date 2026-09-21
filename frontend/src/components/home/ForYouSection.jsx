import React from 'react';
import ServiceCard from './ServiceCard';

const ForYouSection = ({ items, bazaarName }) => {
    if (!items?.length) return null;

    return (
        <section style={{ padding: '24px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#EFF6FF', color: '#1E3A8A', display: 'grid', placeItems: 'center' }}>
                            <i className="fa-solid fa-sparkles" />
                        </span>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>For You</h2>
                    </div>
                    <p style={{ color: '#64748B', fontSize: '13px', margin: '7px 0 0' }}>
                        {bazaarName ? `Popular picks available in ${bazaarName}` : 'Popular picks from shops near you'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => document.getElementById('shop-by-category')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    style={{ border: 'none', background: 'transparent', color: '#1E3A8A', fontWeight: '700', fontSize: '13px', cursor: 'pointer', padding: '8px 0', whiteSpace: 'nowrap' }}
                >
                    Browse all
                </button>
            </div>
            <div className="hide-scrollbar" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
                {items.map((item) => (
                    <div key={item._id || item.id} style={{ flex: '0 0 168px' }}>
                        <ServiceCard item={item} />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ForYouSection;

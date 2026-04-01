import React from 'react';
import { getRecommendationMapping } from '../../utils/tracking';

const YouMayAlsoNeed = ({ lastCategory }) => {
    if (!lastCategory) return null;

    const recommendations = getRecommendationMapping(lastCategory);

    return (
        <section className="section" style={{ padding: '24px 20px' }}>
            <h2 style={{ 
                fontSize: '18px', 
                fontWeight: '800', 
                margin: '0 0 16px 0',
                color: '#1e293b'
            }}>
                You May Also Need
            </h2>
            <div style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }} className="horizontal-scroll">
                {recommendations.map((catName, idx) => (
                    <div 
                        key={idx}
                        onClick={() => window.location.href = `/categories?type=${catName}`}
                        style={{
                            minWidth: '100px',
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '12px 8px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: '#f1f5f9',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6366f1'
                        }}>
                             <i className="fa-solid fa-plus" style={{ fontSize: '14px' }}></i>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>{catName}</span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default YouMayAlsoNeed;

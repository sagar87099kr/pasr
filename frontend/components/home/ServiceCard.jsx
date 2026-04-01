import React from 'react';

const COLORS = {
    PRIMARY: '#1E3A8A',    // Deep Blue
    SECONDARY: '#F97316',  // Orange
    SUCCESS: '#16A34A',    // Green
    TEXT_PRI: '#111827',   // Dark Grey
    TEXT_SEC: '#6B7280',   // Light Grey
    SURFACE: '#FFFFFF'     // White
};

const ServiceCard = ({ item }) => {
    if (!item) return null;

    const isProduct = (item.productName && item.price) || (item.productImage && item.productImage.length > 0);
    const isShop = item.shopName || item.openingTime || item.category === 'Grocery' || item.category === 'Medical';
    const isService = item.company || item.categories === 'Caterings' || item.categories === 'DJ and Tent' || item.categories === 'Four Wheelers';
    const type = isProduct ? 'PRODUCT' : (isShop ? 'SHOP' : 'SERVICE');

    const handleClick = () => {
        const id = item.id || item._id;
        // Validate it looks like a real MongoDB ObjectId (24 hex chars)
        const isRealId = id && /^[a-f\d]{24}$/i.test(String(id));

        if (isProduct) {
            if (isRealId) {
                window.location.href = `/products/${id}`;
            } else {
                window.location.href = '/localMarket'; // fallback to bazaar listing
            }
        } else if (isShop) {
            if (isRealId) {
                window.location.href = `/shops/${id}`;
            } else {
                window.location.href = '/shops'; // fallback to shops listing
            }
        } else if (isService) {
            if (isRealId) {
                window.location.href = `/provider/${id}/profile`;
            } else {
                window.location.href = '/categories'; // fallback to categories
            }
        } else {
            if (isRealId) {
                window.location.href = `/provider/${id}/profile`;
            } else {
                window.location.href = '/categories';
            }
        }
    };

    return (
        <div 
            className="universal-card" 
            onClick={handleClick}
            style={{
                background: COLORS.SURFACE,
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                border: '1px solid #E5E7EB',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'; }}
        >
            {/* Image Section */}
            <div style={{ position: 'relative', width: '100%', paddingTop: '75%' }}>
                <img 
                    src={item.image || item.productImage?.[0]?.url || item.shopImage?.[0]?.url || item.personImage?.[0]?.path || item.personImage?.[0]?.url || '/images/placeholder.jpg'} 
                    alt={item.name || item.productName || item.shopName || item.company} 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
                
                {/* Type Badge - High Contrast */}
                <span style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: COLORS.PRIMARY,
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#FFF',
                    textTransform: 'uppercase'
                }}>
                    {type}
                </span>

                {/* Status - Clean Green */}
                {isShop && (
                    <span style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: 'rgba(255,255,255,0.95)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '800',
                        color: COLORS.SUCCESS,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i>
                        VERIFIED
                    </span>
                )}
            </div>

            {/* Content Section */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '700', 
                    margin: '0 0 4px 0',
                    color: COLORS.TEXT_PRI,
                    lineHeight: '1.4'
                }}>
                    {item.name || item.productName || item.shopName || item.company}
                </h3>
                
                <p style={{ 
                    fontSize: '13px', 
                    color: COLORS.TEXT_SEC, 
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <i className="fa-solid fa-location-dot" style={{ fontSize: '12px' }}></i>
                    {item.location?.split(',')[0] || 'Nearby'}
                </p>

                <div style={{ marginTop: 'auto' }}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleClick(); }}
                        style={{
                            width: '100%',
                            background: COLORS.SECONDARY,
                            color: '#FFF',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)'
                        }}
                    >
                        <i className={`fa-solid ${isShop ? 'fa-shop' : (isProduct ? 'fa-cart-plus' : 'fa-phone')}`}></i>
                        {isShop ? 'Visit Shop' : (isProduct ? 'Order Now' : 'Call Now')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;

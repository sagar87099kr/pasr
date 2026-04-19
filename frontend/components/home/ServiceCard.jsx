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

    const isProduct = !!item.productName;
    const isService = !!item.company || !!item.personImage || ['Four Wheelers', 'Farming Vehicles', 'Caterings', 'DJ and Tent', 'Three Wheelers', 'Filming', 'Decoration', 'Band Party', 'Home Service provider', 'Home Service', 'Heavy Equipments', 'Others'].includes(item.categories) || item.isProvider;
    const isShop = !isProduct && !isService;
    
    const type = isProduct ? 'PRODUCT' : (isShop ? 'SHOP' : 'SERVICE');

    const goToShop = (e) => {
        e.stopPropagation();
        if (item.shopId) {
            window.location.href = `/shops/${item.shopId}`;
        } else if (isShop) {
            window.location.href = `/shops/${item.id || item._id}`;
        }
    };

    const handleClick = () => {
        const id = item.id || item._id;
        const isRealId = id && /^[a-f\d]{24}$/i.test(String(id));

        if (isProduct) {
            if (item.shopId) {
                window.location.href = `/shops/${item.shopId}`;
            } else if (isRealId) {
                window.location.href = `/products/${id}`;
            } else {
                window.location.href = '/localMarket';
            }
        } else if (isShop) {
            if (isRealId) window.location.href = `/shops/${id}`;
            else window.location.href = '/shops';
        } else {
            if (isRealId) window.location.href = `/provider/${id}/profile`;
            else window.location.href = '/categories';
        }
    };

    const actualPrice = item.price && item.discount > 0 
        ? Math.round(item.price * (1 - item.discount / 100))
        : item.price;

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
                    alt={item.productName || item.shopName || item.company || item.name} 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
                
                {/* Type Badge */}
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
                    textTransform: 'uppercase',
                    zIndex: 2
                }}>
                    {type}
                </span>

                {/* Verified Badge for Services */}
                {type === 'SERVICE' && (
                    <span style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: '#DCFCE7',
                        border: '1.5px solid #16A34A',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '900',
                        color: '#16A34A',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        zIndex: 2
                    }}>
                        <i className="fa-solid fa-circle-check"></i> VERIFIED
                    </span>
                )}

                {/* Savings Badge on Image - ONLY show percentage if discount exists */}
                {item.discount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: COLORS.SECONDARY,
                        color: '#FFF',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '900',
                        boxShadow: '0 4px 10px rgba(249, 115, 22, 0.4)',
                        zIndex: 2,
                        textTransform: 'uppercase'
                    }}>
                        {item.discount}% OFF
                    </span>
                )}
            </div>

            {/* Content Section */}
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    margin: '0 0 4px 0',
                    color: COLORS.TEXT_PRI,
                    lineHeight: '1.3',
                    height: '36px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                }}>
                    {item.productName || item.shopName || item.company || item.name}
                </h3>
                
                {/* Price Display - Professional Duo Pricing */}
                {(item.price !== undefined && item.price !== null && item.price > 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                        <span style={{ fontSize: '20px', fontWeight: '800', color: COLORS.SUCCESS, letterSpacing: '-0.5px' }}>
                            ₹{actualPrice}
                        </span>
                        {item.discount > 0 && (
                            <span style={{ 
                                fontSize: '13px', 
                                color: '#9CA3AF', 
                                textDecoration: 'line-through', 
                                fontWeight: '600',
                                opacity: 0.9
                            }}>
                                ₹{item.price}
                            </span>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', marginTop: '4px' }}>
                    {isProduct ? (
                        <div onClick={goToShop} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-store" style={{ fontSize: '10px', color: COLORS.PRIMARY }}></i>
                            <span style={{ fontSize: '11px', color: COLORS.PRIMARY, fontWeight: '700', textDecoration: 'underline' }}>
                                {item.shopName || 'Visit Shop'}
                            </span>
                        </div>
                    ) : (
                        item.location && (
                            <>
                                <i className="fa-solid fa-location-dot" style={{ fontSize: '10px', color: COLORS.TEXT_SEC }}></i>
                                <span style={{ fontSize: '11px', color: COLORS.TEXT_SEC, fontWeight: '500' }}>
                                    {typeof item.location === 'string' ? item.location.split(',')[0] : 'Nearby'}
                                </span>
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;

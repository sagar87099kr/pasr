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
    const isService = item.categories === 'Caterings' || item.categories === 'DJ and Tent' || item.categories === 'Four Wheelers' || item.categories === 'Home Service' || item.isProvider;
    const isShop = !isProduct && !isService;
    
    const type = isProduct ? 'PRODUCT' : (isShop ? 'SHOP' : 'SERVICE');

    const handleAddToCart = async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const response = await fetch('/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    itemId: item.id || item._id, 
                    quantity: 1,
                    itemImage: item.image,
                    shopName: item.shopName
                })
            });
            const data = await response.json();
            if (data.success) {
                if (window.showToast) window.showToast('✅ Added to Cart!', 'success');
                btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }, 2000);
            } else {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
                if (response.status === 401) {
                    window.location.href = '/login?returnUrl=' + encodeURIComponent(window.location.pathname);
                } else {
                    alert(data.message || 'Error adding to cart');
                }
            }
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            console.error(err);
        }
    };

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
            if (isRealId) window.location.href = `/products/${id}`;
            else window.location.href = '/localMarket';
        } else if (isShop) {
            if (isRealId) window.location.href = `/shops/${id}`;
            else window.location.href = '/shops';
        } else {
            if (isRealId) window.location.href = `/provider/${id}/profile`;
            else window.location.href = '/categories';
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

                {/* Price or Verified Badge */}
                {type === 'SERVICE' ? (
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
                ) : (
                    item.price !== undefined && item.price !== null && (
                        <span style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            background: 'rgba(255,255,255,0.95)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '900',
                            color: COLORS.SUCCESS,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            zIndex: 2
                        }}>
                            ₹{item.price}
                        </span>
                    )
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
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
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
                                    {item.location.split(',')[0]}
                                </span>
                            </>
                        )
                    )}
                </div>

                <div style={{ marginTop: 'auto' }}>
                    {isProduct ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                onClick={handleAddToCart}
                                style={{
                                    flex: 1,
                                    background: COLORS.SECONDARY,
                                    color: '#FFF',
                                    border: 'none',
                                    padding: '10px 4px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)'
                                }}
                            >
                                <i className="fa-solid fa-cart-plus me-1"></i> Add
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                                style={{
                                    flex: 1,
                                    background: '#F3F4F6',
                                    color: COLORS.TEXT_PRI,
                                    border: '1px solid #E5E7EB',
                                    padding: '10px 4px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                View
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleClick(); }}
                            style={{
                                width: '100%',
                                background: isShop ? COLORS.PRIMARY : COLORS.SECONDARY,
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
                                gap: '8px'
                            }}
                        >
                            <i className={`fa-solid ${isShop ? 'fa-shop' : 'fa-phone'}`}></i>
                            {isShop ? 'Visit Shop' : 'Call Now'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;

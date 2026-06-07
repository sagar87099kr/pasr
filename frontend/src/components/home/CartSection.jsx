import React from 'react';
import HorizontalSlider from './HorizontalSlider';

const CartSection = ({ items }) => {
    if (!items || items.length === 0) return null;

    // Map cart items to the format expected by HorizontalSlider
    const formattedItems = items.map(item => ({
        id: item.itemId,
        productName: item.name,
        price: item.price,
        image: item.image,
        location: item.shopName, 
        type: 'CART_ITEM'
    }));

    return (
        <HorizontalSlider 
            title="Continue Shopping" 
            icon="fa-cart-shopping" 
            data={formattedItems} 
            viewAllLink="/api/cart"
        />
    );
};

export default CartSection;

import React from 'react';
import { Star, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ShopCard.css';

const ShopCard = ({ shop }) => {
  // Extract real image from DB array
  const imageUrl = (shop.shopImage && shop.shopImage.length > 0) 
    ? shop.shopImage[0].url 
    : "https://via.placeholder.com/400x300?text=No+Image+Available";

  // Check opening times
  const checkIsOpen = () => {
    if (!shop.openingTime || !shop.closingTime) return true; // Default open if no times set
    const now = new Date();
    const currStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    return currStr >= shop.openingTime && currStr <= shop.closingTime;
  };
  const isOpen = checkIsOpen();

  return (
    <Link to={`/shop/${shop._id}`} className="shop-card-wrapper">
      <div className="shop-card">
        <div className="shop-image-container">
          <img src={imageUrl} alt={shop.shopName} className="shop-image" loading="lazy" />
          
          <div className="shop-badges-top">
            <span className={`status-badge ${isOpen ? 'open' : 'closed'}`}>
              {isOpen ? 'Open Now' : 'Closed'}
            </span>
            <span className="category-badge glass-panel text-xs">
              {shop.category || 'Shop'}
            </span>
          </div>
        </div>

        <div className="shop-content">
          <div className="shop-header">
            <h3 className="shop-title truncate">{shop.shopName}</h3>
            <div className="shop-rating">
              <Star size={14} className="star-icon" fill="currentColor" />
              <span className="rating-value">4.5</span>
            </div>
          </div>

          <div className="shop-meta">
            <div className="meta-item text-muted truncate">
              <MapPin size={14} />
              <span className="truncate" style={{maxWidth: '180px'}}>{shop.location}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ShopCard;

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Clock, MapPin, Share2, PhoneCall, AlertTriangle, Plus, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import './ShopDetail.css';

const ShopDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('items');
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const userStr = localStorage.getItem('pasr_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isOwner = user && shop && shop.owner && (user.id === shop.owner._id || user.id === shop.owner);

  // Add Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '', price: '', quantity: '', itemCategory: '', description: '', sizes: ''
  });
  const [itemImage, setItemImage] = useState(null);
  const [submittingItem, setSubmittingItem] = useState(false);
  const [itemMessage, setItemMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const fetchShop = () => {
    axios.get(`http://localhost:5005/api/shops/${id}`)
      .then(res => {
        setShop(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch shop details", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchShop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleItemInputChange = (e) => {
    setItemForm({ ...itemForm, [e.target.name]: e.target.value });
  };

  const submitNewItem = async (e) => {
    e.preventDefault();
    setSubmittingItem(true);
    setItemMessage('');

    const formData = new FormData();
    Object.keys(itemForm).forEach(key => formData.append(key, itemForm[key]));
    if (itemImage) {
      formData.append('itemImage', itemImage);
    }

    try {
      await axios.post(`http://localhost:5005/api/shops/${id}/items`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setItemMessage('Product Added Successfully!');
      setTimeout(() => {
        setShowItemModal(false);
        fetchShop(); // Refresh the list
        setItemMessage('');
        setItemForm({ name: '', price: '', quantity: '', itemCategory: '', description: '', sizes: '' });
        setItemImage(null);
      }, 1500);
    } catch (err) {
      setItemMessage('Failed to add product. Try again.');
    } finally {
      setSubmittingItem(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: shop.shopName,
        text: `Check out ${shop.shopName} on PASR!`,
        url: window.location.href,
      }).catch(err => console.log('Error sharing', err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      setToastMessage('Shop link copied to clipboard!');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleCall = () => {
    if (shop.owner && shop.owner.username) {
      window.location.href = `tel:${shop.owner.username}`;
    } else {
      setToastMessage("Phone number not registered for this shop.");
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const getCartFromCookies = () => {
    const match = document.cookie.match(new RegExp('(^| )pasr_cart=([^;]+)'));
    if (match) {
      try { return JSON.parse(decodeURIComponent(match[2])); } catch (e) { return []; }
    }
    return [];
  };

  const handleAddToCart = (item) => {
    if (!user) {
      setToastMessage("Please login or sign up to add items to your cart! 🔒");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    try {
      const existingCart = getCartFromCookies();
      const existingItemIndex = existingCart.findIndex(cartItem => cartItem._id === item._id);
      
      if (existingItemIndex > -1) {
        existingCart[existingItemIndex].cartQuantity += 1;
      } else {
        existingCart.push({
          ...item,
          cartQuantity: 1,
          shopId: shop._id,
          shopName: shop.shopName
        });
      }
      
      document.cookie = `pasr_cart=${encodeURIComponent(JSON.stringify(existingCart))}; path=/; max-age=86400;`;
      
      setToastMessage(`Added 1x ${item.name} to Cart ✅`);
      window.dispatchEvent(new Event('cart_updated'));
      setTimeout(() => setToastMessage(''), 3000);
    } catch (e) {
      console.error(e);
      setToastMessage("Failed to add to cart.");
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="shop-detail-page animate-fade-in flex justify-center py-20">
        <p className="text-muted text-lg">Loading Shop Details...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="shop-detail-page animate-fade-in flex justify-center py-20 flex-col items-center">
        <AlertTriangle size={48} className="text-muted mb-4" />
        <h2 className="text-2xl font-bold">Shop Not Found</h2>
        <Link to="/" className="btn btn-primary mt-4">Return Home</Link>
      </div>
    );
  }

  const shopImage = (shop.shopImage && shop.shopImage.length > 0) 
    ? shop.shopImage[0].url 
    : "https://via.placeholder.com/1200x500?text=No+Cover+Image";

  const checkIsOpen = () => {
    if (!shop.openingTime || !shop.closingTime) return true; 
    const now = new Date();
    const currStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    return currStr >= shop.openingTime && currStr <= shop.closingTime;
  };
  const isOpen = checkIsOpen();

  const items = shop.items || [];

  return (
    <div className="shop-detail-page animate-fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '80px', right: '16px', zIndex: 9999, backgroundColor: '#111827', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500, animation: 'fadeIn 0.3s ease-in-out' }}>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="shop-banner">
        <Link to="/" className="back-btn glass-panel">
          <ArrowLeft size={20} />
        </Link>
        <img src={shopImage} alt={shop.shopName} className="banner-img" />
        <div className="banner-overlay"></div>
      </div>

      <div className="container shop-detail-content">
        <div className="shop-info-card glass-panel shadow-lg">
          <div className="flex justify-between items-start mb-4 flex-col md:flex-row gap-4">
            <div>
              <span className={`status-badge ${isOpen ? 'open' : 'closed'} mb-2 inline-block`}>
                {isOpen ? 'Open Now' : 'Closed'}
              </span>
              <h1 className="shop-name">{shop.shopName}</h1>
              <p className="shop-category text-primary font-medium">{shop.category}</p>
            </div>
            
            <div className="action-buttons">
              <button onClick={handleShare} className="action-btn" title="Share Shop"><Share2 size={18} /></button>
              <button onClick={handleCall} className="btn btn-primary ml-2" title="Call Owner"><PhoneCall size={18} className="mr-2"/> Call</button>
            </div>
          </div>

          <p className="text-muted mt-2 mb-4 max-w-2xl">{shop.shopDescription}</p>

          <div className="shop-meta-details grid-cols-1 md:grid-cols-3">
            <div className="meta-block">
              <Star className="text-accent mb-1" size={20} fill="currentColor" />
              <span className="font-bold">4.5</span>
              <span className="text-muted text-sm ml-1">(Reviews)</span>
            </div>
            <div className="meta-block">
              <MapPin className="text-muted mb-1" size={20} />
              <span className="text-sm">{shop.location}</span>
            </div>
            <div className="meta-block">
              <Clock className="text-muted mb-1" size={20} />
              <span className="text-sm">
                {shop.openingTime && shop.closingTime ? `${shop.openingTime} - ${shop.closingTime}` : 'Always Open'}
              </span>
            </div>
          </div>
        </div>

        <div className="tabs-container mt-8 flex justify-between items-center flex-wrap gap-4 border-b pb-2">
          <div className="flex gap-4">
            <button 
              className={`tab-btn ${activeTab === 'items' ? 'active font-bold border-b-2 border-primary text-primary' : 'text-muted hover:text-primary'} pb-2 transition-all`}
              onClick={() => setActiveTab('items')}
            >
              Available Items ({items.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'reviews' ? 'active font-bold border-b-2 border-primary text-primary' : 'text-muted hover:text-primary'} pb-2 transition-all`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews & Ratings
            </button>
          </div>
          {isOwner && (
            <button onClick={() => setShowItemModal(true)} className="btn btn-secondary btn-sm flex items-center">
              <Plus size={16} className="mr-1" /> Add Product
            </button>
          )}
        </div>

        <div className="tab-content mt-6 mb-12">
          {activeTab === 'items' && (
            <div className="items-grid">
              {items.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted border border-dashed rounded-lg bg-gray-50 flex flex-col items-center">
                  <p className="mb-4">No items listed for this shop yet.</p>
                  {isOwner && (
                    <button onClick={() => setShowItemModal(true)} className="btn btn-primary btn-sm flex items-center shadow-lg"><Plus size={16} className="mr-1" /> Add the first Product!</button>
                  )}
                </div>
              ) : (
                items.map((item) => (
                  <div key={item._id} className="item-card shadow-sm hover:shadow-md transition-shadow">
                    <img 
                      src={(item.img && item.img.url) ? item.img.url : "https://via.placeholder.com/400?text=No+Image"} 
                      alt={item.name} 
                      className="item-img" 
                    />
                    <div className="item-details p-4">
                      <div className="flex justify-between items-start">
                        <h4 className="item-title truncate font-semibold" title={item.name}>{item.name}</h4>
                        <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded-full">{item.itemCategory || 'General'}</span>
                      </div>
                      <p className="text-xs text-muted mt-1 truncate">{item.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="item-price text-lg text-primary font-bold">₹{item.price}</span>
                        <span className="text-xs text-muted">Stock: {item.quantity}</span>
                      </div>
                      {item.quantity <= 0 && (
                        <div className="mt-3 text-xs text-red-500 font-bold text-center">Out of Stock</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-section">
              <p className="text-muted text-center py-8">Review system will be integrated here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in relative p-6">
            <button onClick={() => setShowItemModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold mb-1">Add New Product</h2>
            <p className="text-sm text-muted mb-6">List a new item for your customers to purchase.</p>

            {itemMessage && (
              <div className={`p-3 mb-4 text-sm rounded-md ${itemMessage.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {itemMessage}
              </div>
            )}

            <form onSubmit={submitNewItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input type="text" name="name" value={itemForm.name} onChange={handleItemInputChange} required className="w-full border border-gray-300 rounded-md p-2 focus:border-primary focus:outline-none" placeholder="e.g. 1kg Fresh Apples" />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input type="number" name="price" value={itemForm.price} onChange={handleItemInputChange} required className="w-full border border-gray-300 rounded-md p-2 focus:border-primary focus:outline-none" placeholder="100" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input type="number" name="quantity" value={itemForm.quantity} onChange={handleItemInputChange} required className="w-full border border-gray-300 rounded-md p-2 focus:border-primary focus:outline-none" placeholder="50" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category (Optional)</label>
                <input type="text" name="itemCategory" value={itemForm.itemCategory} onChange={handleItemInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:border-primary focus:outline-none" placeholder="e.g. Fruits, Baking, Cleaning" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={itemForm.description} onChange={handleItemInputChange} rows="2" className="w-full border border-gray-300 rounded-md p-2 focus:border-primary focus:outline-none" placeholder="Details about this product..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Upload (Required)</label>
                <input type="file" onChange={(e) => setItemImage(e.target.files[0])} required className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-600 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-green-700 cursor-pointer" accept="image/*" />
              </div>

              <div className="pt-4 border-t mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowItemModal(false)} className="btn btn-secondary glass-panel">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingItem}>
                  {submittingItem ? 'Uploading...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopDetail;

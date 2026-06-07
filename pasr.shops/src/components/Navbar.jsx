import React, { useState, useEffect } from 'react';
import { Search, MapPin, User, Menu, X, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);

  const userStr = localStorage.getItem('pasr_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const getCartFromCookies = () => {
    const match = document.cookie.match(new RegExp('(^| )pasr_cart=([^;]+)'));
    if (match) {
      try { return JSON.parse(decodeURIComponent(match[2])); } catch (e) { return []; }
    }
    return [];
  };

  const updateCartCount = () => {
    const cart = getCartFromCookies();
    const totalItems = cart.reduce((acc, item) => acc + item.cartQuantity, 0);
    setCartCount(totalItems);
    setCartItems(cart);
  };

  const handleRemoveItem = (itemId) => {
    let cart = getCartFromCookies();
    cart = cart.filter(item => item._id !== itemId);
    document.cookie = `pasr_cart=${encodeURIComponent(JSON.stringify(cart))}; path=/; max-age=86400;`;
    updateCartCount();
    window.dispatchEvent(new Event('cart_updated'));
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener('cart_updated', updateCartCount);
    return () => window.removeEventListener('cart_updated', updateCartCount);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pasr_user');
    window.location.reload();
  };

  return (
    <nav className="navbar-container glass-panel sticky-top">
      <div className="container nav-content">
        {/* Logo Section */}
        <Link to="/" className="nav-logo">
          <span className="logo-text" style={{ fontSize: '1.4rem', fontWeight: 800 }}>pasr.<span className="text-primary">shops</span></span>
        </Link>

        {/* Search Bar - Universal */}
        <div className="nav-search">
          <div className="search-box">
            <Search size={18} className="search-icon-left text-muted" />
            <input 
              type="text" 
              placeholder="Search your listed products..." 
              className="search-input"
              onChange={(e) => {
                window.dispatchEvent(new CustomEvent('search_owner_items', { detail: e.target.value }));
              }}
            />
            <button className="search-btn">
              <Search size={18} />
            </button>
          </div>
        </div>

        {/* Action Buttons - Desktop */}
        <div className="nav-actions hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setIsCartOpen(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <ShoppingBag size={24} className="text-gray-800" />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: '0', right: '0', backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '2px solid white' }}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
          
          <Link to="/create-shop" className="nav-link">Become a Seller</Link>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-700 hidden sm:inline-block">Hi, {user?.name ? user.name.split(' ')[0] : 'User'}</span>
              <button onClick={handleLogout} className="btn btn-secondary text-red-600 bg-red-50 border-red-100 hover:bg-red-100">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/auth" className="btn btn-secondary">
              <User size={18} className="mr-2" />
              Login / Sign Up
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-toggle hidden-desktop"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu animate-fade-in shadow-md">
          <button onClick={() => { setIsCartOpen(true); setIsMobileMenuOpen(false); }} className="mobile-link text-left w-full flex justify-between">
            <span>Your Cart</span>
            {cartCount > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{cartCount}</span>}
          </button>
          <Link to="/create-shop" className="mobile-link">Become a Seller</Link>
          {user ? (
            <>
              <div className="mobile-link text-center text-primary font-bold">Hi, {user?.name ? user.name.split(' ')[0] : 'User'}</div>
              <button onClick={handleLogout} className="btn w-full mt-2 justify-center text-red-600 bg-red-50 border-red-100">Logout</button>
            </>
          ) : (
            <Link to="/auth" className="btn btn-primary w-full mt-4 justify-center">Login / Sign Up</Link>
          )}
        </div>
      )}

      {/* Cart Sidebar Modal */}
      {isCartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setIsCartOpen(false)}></div>
          <div style={{ position: 'relative', width: '100%', maxWidth: '450px', backgroundColor: 'white', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 25px rgba(0,0,0,0.2)', animation: 'slideInRight 0.3s ease-out' }}>
            
            <div style={{ padding: '24px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#111827' }}><ShoppingBag size={22}/> Your Shopping Cart</h2>
              <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}><X size={24} className="text-gray-500 hover:text-black"/></button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '60px' }}>
                  <ShoppingBag size={64} style={{ margin: '0 auto 15px', color: '#d1d5db' }}/>
                  <p style={{ fontSize: '1.1rem' }}>Your shopping cart is currently empty.</p>
                  <button onClick={() => setIsCartOpen(false)} className="btn btn-primary mt-6">Continue Shopping</button>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb', alignItems: 'flex-start' }}>
                    <img src={item.img?.url || "https://via.placeholder.com/100?text=No+Image"} alt={item.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: '#1f2937', paddingRight: '10px' }}>{item.name}</h4>
                        <button onClick={() => handleRemoveItem(item._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }} title="Remove item">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#6b7280' }}>Shop: {item.shopName}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '1.1rem' }}>₹{item.price}</span>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>Qty: {item.cartQuantity}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div style={{ padding: '24px 20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '20px', color: '#111827' }}>
                  <span>Subtotal:</span>
                  <span style={{ color: '#2563eb' }}>₹{cartItems.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0)}</span>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1.05rem', fontWeight: 'bold', borderRadius: '8px' }}>Proceed to Checkout</button>
              </div>
            )}
          </div>
        </div>
      )}

    </nav>
  );
};

export default Navbar;

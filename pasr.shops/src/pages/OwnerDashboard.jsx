import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Store, PlusCircle, Package, IndianRupee, TrendingUp, AlertCircle, Clock, MapPin, X, FileText, Edit } from 'lucide-react';
import './OwnerDashboard.css';

const OwnerDashboard = () => {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', itemCategory: '', price: '', quantity: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('pasr_user');
    if (!userStr) {
      navigate('/auth');
      return;
    }

    const user = JSON.parse(userStr);
    const ownerId = user.id || user._id;
    if (!ownerId) {
      localStorage.removeItem('pasr_user');
      navigate('/auth');
      return;
    }
    
    const handleSearch = (e) => setSearchTerm(e.detail);
    window.addEventListener('search_owner_items', handleSearch);

    const fetchOwnerShop = async () => {
      try {
        const ownerId = user.id || user._id;
        const res = await axios.get(`http://localhost:5005/api/shops/owner/${ownerId}`);
        setShop(res.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Shop not found for owner
          setShop(null);
        } else {
          setError('Failed to load dashboard data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerShop();

    return () => {
      window.removeEventListener('search_owner_items', handleSearch);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard-loading animate-fade-in">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error container animate-fade-in">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="no-shop-container animate-fade-in">
        <div className="glass-panel no-shop-card text-center shadow-float">
          <div className="icon-wrapper bg-primary/10 text-primary mx-auto mb-6">
            <Store size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-3">You haven't listed a shop yet</h2>
          <p className="text-muted mb-8 text-lg max-w-md mx-auto">
            Create your shop profile today to reach more local customers, manage your inventory, and grow your business.
          </p>
          <button 
            className="btn btn-primary btn-lg w-full sm:w-auto"
            onClick={() => navigate('/create-shop')}
          >
            <PlusCircle className="mr-2" /> List Your Shop Now
          </button>
        </div>
      </div>
    );
  }

  // Filter items based on search term
  const displayedItems = shop.items?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.itemCategory && item.itemCategory.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await axios.put(`http://localhost:5005/api/items/${editingItem._id}`, editFormData);
      const updatedItems = shop.items.map(item => 
        item._id === editingItem._id ? { ...item, ...res.data } : item
      );
      setShop({ ...shop, items: updatedItems });
      setEditingItem(null);
    } catch (err) {
      alert('Failed to update item.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Accurate data from backend
  const totalItems = shop.items ? shop.items.length : 0;
  const realRevenue = "₹" + (shop.totalRevenue || 0).toLocaleString();
  const realOrders = shop.totalOrders || 0;

  return (
    <div className="owner-dashboard animate-fade-in">
      <div className="dashboard-header bg-gradient-primary text-white py-12 px-6 shadow-md mb-8">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-2">Welcome back!</h1>
          <p className="text-white/80 text-lg">Here's what's happening with your shop today.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="stat-card glass-panel shadow-sm hover-lift">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted font-medium">Total Revenue</h3>
              <div className="icon-bg bg-green-100 text-green-600"><IndianRupee size={20} /></div>
            </div>
            <div className="text-3xl font-bold">{realRevenue}</div>
            <div className="text-sm text-green-500 flex items-center mt-2">
              <TrendingUp size={14} className="mr-1" /> +12% from last month
            </div>
          </div>
          
          <div className="stat-card glass-panel shadow-sm hover-lift">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted font-medium">Listed Items</h3>
              <div className="icon-bg bg-blue-100 text-blue-600"><Package size={20} /></div>
            </div>
            <div className="text-3xl font-bold">{totalItems}</div>
            <div className="text-sm text-muted mt-2">Active products in catalog</div>
          </div>

          <div 
            className="stat-card glass-panel shadow-sm hover-lift cursor-pointer border-transparent hover:border-purple-500/30"
            onClick={() => setShowOrderHistory(true)}
            title="Click to view all orders"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted font-medium">Total Orders</h3>
              <div className="icon-bg bg-purple-100 text-purple-600"><Store size={20} /></div>
            </div>
            <div className="text-3xl font-bold">{realOrders}</div>
            <div className="text-sm text-purple-500 flex items-center mt-2">
              <span className="font-semibold text-purple-600">View History &rarr;</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shop Profile Summary */}
          <div className="lg:col-span-1">
            <div className="glass-panel profile-panel shadow-sm sticky top-6">
              <div className="profile-image-container mb-6">
                {shop.shopImage && shop.shopImage.length > 0 ? (
                  <img src={shop.shopImage[0].url} alt={shop.shopName} className="shop-profile-img rounded-xl shadow-md object-cover w-full h-48" />
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                    <Store size={48} />
                  </div>
                )}
                <div className={`status-badge ${shop.verified ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  {shop.verified ? 'Verified' : 'Pending Verification'}
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-1">{shop.shopName}</h2>
              <p className="text-primary font-medium mb-4">{shop.category}</p>
              
              <div className="space-y-3 text-sm mb-6">
                <div className="flex items-start text-gray-600">
                  <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>{shop.location}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock size={16} className="mr-2 flex-shrink-0" />
                  <span>{shop.openingTime} - {shop.closingTime}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button 
                  className="btn btn-outline-primary w-full justify-center"
                  onClick={() => navigate(`/shop/${shop._id}`)}
                >
                  View Public Profile
                </button>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Items</h2>
              <button 
                className="btn btn-primary btn-sm flex items-center"
                onClick={() => navigate(`/shop/${shop._id}`)}
              >
                <PlusCircle size={16} className="mr-1" /> Add New Item
              </button>
            </div>

            {displayedItems && displayedItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayedItems.map((item) => (
                  <div key={item._id} className="glass-panel item-card p-4 flex gap-4 items-center hover-lift transition-all border border-transparent hover:border-primary/20 cursor-pointer">
                    <div className="item-img-container h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {item.img && item.img.url ? (
                         <img src={item.img.url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-400"><Package size={24}/></div>
                      )}
                    </div>
                    <div className="item-details flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800 truncate pr-2">{item.name}</h4>
                        <button 
                          className="text-gray-400 hover:text-primary transition-colors p-1"
                          title="Edit Product"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                            setEditFormData({
                              name: item.name || '',
                              itemCategory: item.itemCategory || '',
                              price: item.price || '',
                              quantity: item.quantity || '',
                              description: item.description || ''
                            });
                          }}
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">{item.itemCategory}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-primary">₹{item.price}</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">Qty: {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel text-center py-12 border-dashed border-2 border-gray-200">
                <Package size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  {searchTerm ? 'No products match your search' : 'No items listed yet'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'Try adjusting your search term.' : 'Start adding items to your shop to attract customers.'}
                </p>
                {!searchTerm && (
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => navigate(`/shop/${shop._id}`)}
                  >
                    Add First Item
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order History Modal */}
      {showOrderHistory && (
        <div className="modal-overlay animate-fade-in" onClick={() => { setShowOrderHistory(false); setExpandedOrderId(null); }}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-2xl font-bold flex items-center">
                <FileText className="mr-2 text-primary" size={24} /> 
                Order History
              </h2>
              <button className="modal-close" onClick={() => { setShowOrderHistory(false); setExpandedOrderId(null); }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              {shop.ordersList && shop.ordersList.length > 0 ? (
                <div className="orders-list">
                  {shop.ordersList.map((order, idx) => {
                    const orderId = order._id || order.orderId || idx;
                    const isExpanded = expandedOrderId === orderId;

                    return (
                      <div 
                        key={orderId} 
                        className={`order-item-card mb-4 border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden ${isExpanded ? 'shadow-md border-primary/40' : ''}`}
                      >
                        <div 
                          className="p-4 cursor-pointer flex flex-col hover:bg-gray-100/50 transition-colors"
                          onClick={() => setExpandedOrderId(isExpanded ? null : orderId)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm text-muted font-mono">#{order.orderId || order._id}</p>
                              <p className="font-bold text-gray-800 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <div className={`status-badge-inline ${order.orderStatus === 'COMPLETED' ? 'text-green-600 bg-green-100' : 'text-blue-600 bg-blue-100'} px-2 py-1 rounded-full text-xs font-bold mb-1`}>
                                {order.orderStatus || 'PENDING'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-sm text-gray-600">
                              {order.items ? order.items.reduce((sum, i) => sum + i.quantity, 0) : 0} items
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-lg text-primary">₹{order.totalAmount || order.subtotalAmount || 0}</span>
                              <span className="text-gray-400 transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                ▼
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dropdown Details */}
                        {isExpanded && (
                          <div className="p-4 bg-white border-t border-gray-100 animate-fade-in">
                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 text-sm text-gray-600">
                              <span>Payment: <strong>{order.paymentType || 'COD'}</strong></span>
                              <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                            </div>

                            <div className="space-y-3 mb-4">
                              {order.items && order.items.map((orderItem, iIdx) => {
                                const shopItem = shop.items?.find(i => i._id === orderItem.itemId);
                                const itemImg = shopItem?.img?.url || null;
                                
                                return (
                                  <div key={iIdx} className="flex gap-3 items-center">
                                    <div className="w-12 h-12 bg-gray-50 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                      {itemImg ? (
                                        <img src={itemImg} alt={orderItem.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                          <Package size={14} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-bold text-sm text-gray-800 truncate">{orderItem.name}</h5>
                                      <p className="text-xs text-gray-500">Qty: {orderItem.quantity} &times; ₹{orderItem.price}</p>
                                    </div>
                                    <div className="text-sm font-bold text-gray-800">
                                      ₹{orderItem.price * orderItem.quantity}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="pt-3 border-t border-gray-100 text-sm">
                              <div className="flex justify-between items-center mb-1 text-gray-600">
                                <span>Subtotal</span>
                                <span>₹{order.subtotalAmount || 0}</span>
                              </div>
                              {order.deliveryCharge > 0 && (
                                <div className="flex justify-between items-center mb-1 text-gray-600">
                                  <span>Delivery</span>
                                  <span>₹{order.deliveryCharge}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                <span className="font-bold text-gray-800">Total</span>
                                <span className="font-bold text-primary">₹{order.totalAmount || order.subtotalAmount || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700">No orders yet</h3>
                  <p className="text-gray-500">When customers place orders, they will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingItem && (
        <div className="modal-overlay animate-fade-in" onClick={() => setEditingItem(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-2xl font-bold flex items-center">
                <Edit className="mr-2 text-primary" size={24} /> 
                Edit Product
              </h2>
              <button className="modal-close" onClick={() => setEditingItem(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Product Name</label>
                  <input type="text" className="w-full p-2 border border-gray-300 rounded focus:border-primary focus:outline-none" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Category</label>
                  <input type="text" className="w-full p-2 border border-gray-300 rounded focus:border-primary focus:outline-none" value={editFormData.itemCategory} onChange={e => setEditFormData({...editFormData, itemCategory: e.target.value})} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-gray-700">Price (₹)</label>
                    <input type="number" className="w-full p-2 border border-gray-300 rounded focus:border-primary focus:outline-none" value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: e.target.value})} required />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-gray-700">Quantity</label>
                    <input type="number" className="w-full p-2 border border-gray-300 rounded focus:border-primary focus:outline-none" value={editFormData.quantity} onChange={e => setEditFormData({...editFormData, quantity: e.target.value})} required />
                  </div>
                </div>
                <div className="pt-6 flex justify-end gap-3 mt-4">
                  <button type="button" className="btn btn-outline-primary" onClick={() => setEditingItem(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;

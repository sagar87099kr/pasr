import React, { useState, useEffect } from 'react';
import { Store, UploadCloud, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';
import './CreateShop.css';

const CATEGORIES = [
  "Automobile", "Bakery", "Beauty/Cosmetics", "Coaching", "Dhaba", 
  "Electronics", "Fashion", "Footwear", "Furniture", "General Store", 
  "Grocery", "Hardware", "Jewelers", "Medical", "Mobile Shop", 
  "Non-Veg", "Restaurant", "Salon", "Vegetables & Fruits", "Others"
];

const CreateShop = () => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('pasr_user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!user) {
      navigate('/auth', { state: { message: "Please log in to register a Shop." } });
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState({
    shopName: '', gstNumber: '', category: '', location: '', 
    openingTime: '', closingTime: '', shopDescription: '', upiId: ''
  });
  
  const [shopImage, setShopImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setShopImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const submitData = new FormData();
    Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
    if (shopImage) submitData.append('shopImage', shopImage);
    if (user && (user.id || user._id)) submitData.append('ownerId', user.id || user._id);

    try {
      const res = await axios.post('http://localhost:5005/api/shops', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ type: 'success', text: res.data.message });
      setFormData({ shopName: '', gstNumber: '', category: '', location: '', openingTime: '', closingTime: '', shopDescription: '', upiId: ''});
      setShopImage(null);
      setPreview(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error creating shop' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="auth-page">
      <div className="create-shop-container mx-auto">
        <div className="auth-card glass-panel shadow-float animate-fade-in">
          
          <div className="auth-header">
            <div className="logo-icon mx-auto mb-4 flex items-center justify-center bg-primary" style={{ width: '48px', height: '48px', borderRadius: '50%' }}>
              <Store size={24} className="text-white" />
            </div>
            <h2 className="auth-title">List Your Shop</h2>
            <p className="text-muted text-center mt-2 mb-4">
              Create your digital storefront on PaSr local marketplace.
            </p>
          </div>

          {message.text && (
            <div className={`p-3 mb-4 rounded-md text-sm text-center ${message.type === 'error' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-green-100 text-green-600 border border-green-200'}`} style={{ backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4', color: message.type === 'error' ? '#dc2626' : '#16a34a', border: '1px solid', borderColor: message.type === 'error' ? '#fecaca' : '#bbf7d0', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form mt-4">
            
            <div className="row-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="input-group" style={{ flex: '1 1 250px' }}>
                <label className="input-label">Shop Name *</label>
                <input type="text" name="shopName" value={formData.shopName} onChange={handleInputChange} className="input-field" required placeholder="e.g. Fresh Daily Mart" />
              </div>
              <div className="input-group" style={{ flex: '1 1 200px' }}>
                <label className="input-label">Category *</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="input-field" required style={{ backgroundColor: '#fff' }}>
                  <option value="" disabled>Select Category...</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Location / Full Address *</label>
              <textarea name="location" value={formData.location} onChange={handleInputChange} rows="2" className="input-field" required placeholder="Enter shop's physical address..."></textarea>
            </div>

            <div className="row-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="input-group" style={{ flex: '1 1 150px' }}>
                <label className="input-label">Opening Time *</label>
                <input type="time" name="openingTime" value={formData.openingTime} onChange={handleInputChange} className="input-field" required />
              </div>
              <div className="input-group" style={{ flex: '1 1 150px' }}>
                <label className="input-label">Closing Time *</label>
                <input type="time" name="closingTime" value={formData.closingTime} onChange={handleInputChange} className="input-field" required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Shop Description</label>
              <textarea name="shopDescription" value={formData.shopDescription} onChange={handleInputChange} rows="2" className="input-field" placeholder="Describe the items you sell and your shop's history..."></textarea>
            </div>

            <div className="row-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="input-group" style={{ flex: '1 1 200px' }}>
                <label className="input-label">UPI ID for Payouts * <Info size={12} className="inline ml-1 text-muted" title="PASR sends your earnings here" /></label>
                <input type="text" name="upiId" value={formData.upiId} onChange={handleInputChange} className="input-field" required placeholder="e.g. 9876543210@paytm" />
              </div>
              <div className="input-group" style={{ flex: '1 1 200px' }}>
                <label className="input-label">GST Number <span className="text-xs text-green-600 font-normal opacity-75">(Optional)</span></label>
                <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} className="input-field" placeholder="15-digit GSTIN" maxLength="15" />
              </div>
            </div>

            <div className="input-group mt-2 mb-4">
              <label className="input-label">Shop Front Image *</label>
              <div className="upload-area border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                {preview ? (
                  <>
                    <img src={preview} alt="Preview" className="h-32 object-contain mb-3 rounded shadow-sm" />
                    <span className="text-sm text-primary font-medium">Click to change photo</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={32} className="text-muted mb-2" />
                    <p className="font-medium text-gray-700 mb-1 text-sm">Upload a clear photo of your store</p>
                  </>
                )}
                <input type="file" name="shopImage" onChange={handleFileChange} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" accept="image/*" required={!preview} />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 mb-6 text-sm text-muted">
              <input type="checkbox" className="custom-checkbox" required />
              <label>I verify this shop listing complies with PASR guidelines</label>
            </div>

            <button type="submit" className="btn btn-primary w-full justify-center py-3 text-lg" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Submitting & Uploading Image...' : 'Launch Your Shop on PASR'}
            </button>
          </form>

          <div className="text-center mt-6">
             <Link to="/" className="text-sm text-secondary hover:text-primary transition-colors">
               &larr; Back to Home
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreateShop;

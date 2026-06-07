import React, { useState } from 'react';
import { Store, User, Lock, Phone, MapPin, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [validated, setValidated] = useState(false);
  
  // OTP Flow States
  const [step, setStep] = useState(1); // 1 = Form, 2 = Verify OTP
  const [generatedOtp, setGeneratedOtp] = useState(''); // Retained just to render wa.me link
  const [enteredOtp, setEnteredOtp] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    address: '',
    referralCode: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    // Bootstrap Validation UI trigger
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Additional cross-field validation for password match
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      setValidated(true);
      return;
    }

    setValidated(true); // show green ticks/red borders based on valid status
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (isLogin) {
        const payload = {
          username: formData.username,
          password: formData.password
        };
        const res = await axios.post('http://localhost:5005/api/auth/login', payload);
        setMessage({ type: 'success', text: res.data.message });
        localStorage.setItem('pasr_user', JSON.stringify(res.data.user));
        window.location.href = '/dashboard';
      } else {
        const res = await axios.post('http://localhost:5005/api/auth/signup-step1', formData);
        if (res.data.requiresOtp) {
          setGeneratedOtp(res.data.otp);
          setStep(2);
          setMessage({ type: 'success', text: 'Please complete WhatsApp verification.' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.post('http://localhost:5005/api/auth/verify-otp', {
         username: formData.username,
         otp: enteredOtp
      });
      setMessage({ type: 'success', text: res.data.message });
      localStorage.setItem('pasr_user', JSON.stringify(res.data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Invalid OTP' });
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setValidated(false); // Reset validation UI
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card glass-panel shadow-float animate-fade-in">
          
          <div className="auth-header">
            <div className={`logo-icon mx-auto flex items-center justify-center rounded-full mb-4 bg-primary`} style={{width: '64px', height: '64px'}}>
              <Store size={32} className="text-white" />
            </div>
            <h2 className="auth-title">
              {step === 2 ? "Verify OTP" : (isLogin ? "Welcome Back" : "Join PaSr")}
            </h2>
            <p className="text-muted text-center mt-2 mx-auto" style={{maxWidth: '80%'}}>
              {step === 2 
                 ? "Send the secure OTP to yourself to verify your WhatsApp number."
                 : (isLogin ? "Log in to manage your shops, orders, and local services." : "Find the best local services and daily shops in your neighborhood.")}
            </p>
          </div>

          {message.text && (
            <div className={`p-3 mb-4 rounded-md text-sm text-center ${message.type === 'error' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
              {message.text}
            </div>
          )}

          {step === 1 ? (
            <form className={`auth-form mt-4 ${validated ? 'was-validated' : ''}`} noValidate onSubmit={handleAuthSubmit}>
              {!isLogin && (
                <div className="input-group">
                  <label className="input-label">Full Name *</label>
                  <div className="input-with-icon relative">
                    <User size={18} className="absolute left-3 top-3.5 text-muted z-10" />
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="input-field pl-10" required minLength="3" placeholder="Sagar Verma" />
                    <div className="invalid-feedback">Please enter your full name (min 3 chars).</div>
                  </div>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">WhatsApp Number *</label>
                <div className="input-with-icon relative">
                  <Phone size={18} className="absolute left-3 top-3.5 text-muted z-10" />
                  <input type="tel" name="username" value={formData.username} onChange={handleInputChange} className="input-field pl-10" required pattern="[0-9]{10}" placeholder="10-digit mobile number" />
                  <div className="invalid-feedback">A valid 10-digit WhatsApp number is required.</div>
                </div>
              </div>

              {!isLogin && (
                <div className="input-group">
                  <label className="input-label">Complete Address *</label>
                  <div className="input-with-icon relative">
                    <MapPin size={18} className="absolute left-3 top-3.5 text-muted z-10" />
                    <textarea name="address" value={formData.address} onChange={handleInputChange} className="input-field pl-10 pt-3" rows="2" required placeholder="House No, Street, City..."></textarea>
                    <div className="invalid-feedback">Address is required to show nearby shops.</div>
                  </div>
                </div>
              )}

              <div className="row-group" style={!isLogin ? { display: 'flex', gap: '1rem' } : {}}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Password *</label>
                  <div className="input-with-icon relative">
                    <Lock size={18} className="absolute left-3 top-3.5 text-muted z-10" />
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="input-field pl-10" required minLength="4" placeholder="Min 4 chars" />
                    <div className="invalid-feedback">Password must be at least 4 characters.</div>
                  </div>
                </div>

                {!isLogin && (
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Confirm Password *</label>
                    <div className="input-with-icon relative">
                      <Lock size={18} className="absolute left-3 top-3.5 text-muted z-10" />
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="input-field pl-10" required minLength="4" />
                      <div className="invalid-feedback">Required.</div>
                    </div>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="input-group">
                  <label className="input-label">Referral Code <span className="text-xs text-muted font-normal">(Optional)</span></label>
                  <input type="text" name="referralCode" value={formData.referralCode} onChange={handleInputChange} className="input-field" placeholder="E.g. PASR1234" />
                </div>
              )}

              {isLogin && (
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="remember" className="custom-checkbox" />
                    <label htmlFor="remember" className="text-sm cursor-pointer">Remember me</label>
                  </div>
                  <span className="text-sm text-primary cursor-pointer hover:font-bold transition-all">Forgot your password?</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full justify-center py-3 text-lg" disabled={loading}>
                {loading ? 'Processing...' : (isLogin ? 'Login to PaSr' : 'Create Account')}
              </button>
            </form>
          ) : (
            
            /* OTP VERIFICATION STEP 2 */
            <div className="otp-verification-step mt-6 animate-fade-in text-center">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
                 <p className="text-sm text-gray-700 mb-3">
                   <strong>Friction Verification:</strong> Since we don't have a paid SMS gateway in this demo, click the button below to send your OTP code to the Admin WhatsApp to prove ownership, then type it below to complete registration!
                 </p>
                 <a 
                   href={`https://wa.me/918252271535?text=${encodeURIComponent(`My PaSr registration OTP is: ${generatedOtp}\n\n(Please verify this number)`)}`}
                   target="_blank" rel="noreferrer"
                   className="btn btn-secondary w-full justify-center bg-green-50 text-green-700 border-green-300 hover:bg-green-100 mb-2 py-3"
                 >
                   <CheckCircle size={18} className="mr-2" />
                   Send OTP to Admin on WhatsApp
                 </a>
              </div>

              <form onSubmit={verifyOtp} className={`auth-form ${validated ? 'was-validated' : ''}`} noValidate>
                 <div className="input-group mb-6">
                    <label className="input-label text-left">Enter 6-digit OTP</label>
                    <input 
                      type="text" 
                      value={enteredOtp} 
                      onChange={(e) => setEnteredOtp(e.target.value)} 
                      className="input-field text-center text-xl tracking-widest font-bold" 
                      required pattern="[0-9]{6}" 
                      maxLength="6"
                      placeholder="• • • • • •" 
                    />
                    <div className="invalid-feedback text-left">Please enter the 6 digits correctly.</div>
                 </div>
                 <button type="submit" className="btn btn-primary w-full justify-center py-3 text-lg" disabled={loading}>
                   {loading ? 'Verifying...' : 'Complete Verification'}
                 </button>
                 <button type="button" onClick={() => setStep(1)} className="btn btn-secondary w-full justify-center py-3 text-lg mt-3 bg-transparent border-transparent">
                   &larr; Back to Mobile Number
                 </button>
              </form>
            </div>
          )}

          {step === 1 && (
            <div className="text-center mt-6 pt-4 border-t">
              <span className="text-muted text-sm">
                {isLogin ? "New to PaSr? " : "Already have an account? "}
                <span onClick={toggleAuthMode} className="text-primary font-bold cursor-pointer hover:underline transition-colors">
                  {isLogin ? 'Sign up for free' : 'Log in here'}
                </span>
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Auth;

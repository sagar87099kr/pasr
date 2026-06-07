import React from 'react';
import './Footer.css';
import { Twitter, Instagram, Facebook, MapPin, Mail, Phone } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer border-t mt-auto">
      <div className="container footer-grid">
        <div className="footer-col brand-col">
          <h3 className="footer-logo">pasr.<span className="text-primary">shops</span></h3>
          <p className="footer-desc text-muted mt-4">
            Connect with verified local farmers, daily shops, and home services directly in your neighborhood.
          </p>
          <div className="social-links mt-6">
            <a href="#" className="social-icon"><Twitter size={20} /></a>
            <a href="#" className="social-icon"><Instagram size={20} /></a>
            <a href="#" className="social-icon"><Facebook size={20} /></a>
          </div>
        </div>
        
        <div className="footer-col">
          <h4 className="footer-heading">Explore</h4>
          <ul className="footer-links">
            <li><a href="#">Local Markets</a></li>
            <li><a href="#">Kisan Sabha</a></li>
            <li><a href="#">Services</a></li>
            <li><a href="#">Verified Providers</a></li>
          </ul>
        </div>
        
        <div className="footer-col">
          <h4 className="footer-heading">Company</h4>
          <ul className="footer-links">
            <li><a href="#">About Us</a></li>
            <li><a href="#">Become a Seller</a></li>
            <li><a href="#">Terms & Privacy</a></li>
            <li><a href="#">Help Center</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Contact</h4>
          <ul className="footer-contact">
            <li><MapPin size={18} className="text-primary" /> <span>India</span></li>
            <li><Mail size={18} className="text-primary" /> <span>support@pasr.in</span></li>
            <li><Phone size={18} className="text-primary" /> <span>+91 1234567890</span></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom text-muted">
        <div className="container bottom-flex">
          <p>&copy; {new Date().getFullYear()} PASR. All rights reserved.</p>
          <p>Made with ❤️ for Local Communities</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

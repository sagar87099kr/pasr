import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ShopDetail from './pages/ShopDetail';
import Auth from './pages/Auth';
import CreateShop from './pages/CreateShop';
import OwnerDashboard from './pages/OwnerDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/shop/:id" element={<ShopDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create-shop" element={<CreateShop />} />
            <Route path="/dashboard" element={<OwnerDashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

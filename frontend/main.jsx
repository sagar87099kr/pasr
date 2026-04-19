import React from 'react';
import { createRoot } from 'react-dom/client';
import NavbarSearch from './components/NavbarSearch';
import HomePage from './pages/HomePage';
import ShopItemsPage from './pages/ShopItemsPage';

// Mount Navbar Search
const searchMount = document.getElementById('react-navbar-search');
if (searchMount) {
  const root = createRoot(searchMount);
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';
  root.render(<NavbarSearch initialQuery={initialQuery} />);
}

// Mount Homepage
const homeMount = document.getElementById('react-homepage');
if (homeMount) {
  const root = createRoot(homeMount);
  const isLoggedIn = homeMount.dataset.isLoggedIn === 'true';
  root.render(<HomePage isLoggedIn={isLoggedIn} />);
}

// Mount Shop Items Page
const shopItemsMount = document.getElementById('react-shop-items');
if (shopItemsMount) {
  const root = createRoot(shopItemsMount);
  const isLoggedIn = shopItemsMount.dataset.isLoggedIn === 'true';
  root.render(<ShopItemsPage isLoggedIn={isLoggedIn} />);
}

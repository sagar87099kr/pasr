import React from 'react';
import { createRoot } from 'react-dom/client';
import NavbarSearch from './components/NavbarSearch';
import HomePage from './pages/HomePage';

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
  root.render(<HomePage />);
}

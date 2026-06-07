import React from 'react';
import { createRoot } from 'react-dom/client';
import NavbarSearch from './components/NavbarSearch';

const searchMount = document.getElementById('react-navbar-search');
if (searchMount) {
  const root = createRoot(searchMount);
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';

  root.render(<NavbarSearch initialQuery={initialQuery} />);
}

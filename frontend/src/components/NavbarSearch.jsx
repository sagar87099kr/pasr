import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Store, Leaf, Briefcase } from 'lucide-react';
import './NavbarSearch.css';

export default function NavbarSearch({ initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions(null);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to fetch suggestions', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = suggestions && (
    suggestions.items?.length > 0 ||
    suggestions.shops?.length > 0 ||
    suggestions.products?.length > 0 ||
    suggestions.providers?.length > 0
  );

  return (
    <div style={{ position: 'relative', flexGrow: 1, display: 'flex' }} className="d-flex flex-grow-1 header-search-form">
      <form action="/search" method="GET" style={{ display: 'flex', width: '100%', gap: '4px' }}>

        <input
          ref={inputRef}
          type="search"
          name="q"
          className="form-control form-control-sm flex-grow-1 notranslate"
          placeholder="Search by name, phone..."
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
        />
        <button className="btn btn-sm btn-outline-success px-2" type="submit">
          <Search size={16} />
        </button>
      </form>

      {isOpen && (
        <div ref={dropdownRef} className="search-suggestions-dropdown">
          {hasResults ? (
            <>
              {suggestions.items?.length > 0 && (
                <SuggestionGroup title="Items">
                  {suggestions.items.map(item => (
                    <a key={item._id} href={`/items/${item._id}`} className="suggestion-item">
                      <div className="suggestion-title">{item.name} <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>₹{item.price}</span></div>
                      <div className="suggestion-subtitle"><Store size={12} style={{marginRight: 4}}/> {item.shop?.shopName}</div>
                    </a>
                  ))}
                </SuggestionGroup>
              )}
              {suggestions.shops?.length > 0 && (
                <SuggestionGroup title="Local Shops">
                  {suggestions.shops.map(shop => (
                    <a key={shop._id} href={`/shops/${shop._id}`} className="suggestion-item">
                      <div className="suggestion-title">{shop.shopName}</div>
                      <div className="suggestion-subtitle"><MapPin size={12} style={{marginRight: 4}}/> {shop.category} &middot; {shop.location}</div>
                    </a>
                  ))}
                </SuggestionGroup>
              )}
              {suggestions.products?.length > 0 && (
                <SuggestionGroup title="Products">
                  {suggestions.products.map(product => (
                    <a key={product._id} href={`/products/${product._id}`} className="suggestion-item">
                      <div className="suggestion-title">{product.productName} <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>₹{product.price}</span></div>
                      <div className="suggestion-subtitle"><Leaf size={12} style={{marginRight: 4}}/> {product.categories} &middot; {product.location}</div>
                    </a>
                  ))}
                </SuggestionGroup>
              )}
              {suggestions.providers?.length > 0 && (
                <SuggestionGroup title="Providers">
                  {suggestions.providers.map(provider => (
                    <a key={provider._id} href={`/provider/${provider._id}/profile`} className="suggestion-item">
                      <div className="suggestion-title">{provider.company}</div>
                      <div className="suggestion-subtitle"><Briefcase size={12} style={{marginRight: 4}}/> {provider.categories} &middot; {provider.location}</div>
                    </a>
                  ))}
                </SuggestionGroup>
              )}
            </>
          ) : (
            <div className="suggestion-item" style={{display: 'flex', justifyContent: 'center', textAlign: 'center'}}>
              <div className="suggestion-subtitle">No quick results found.<br/>Press enter to search all.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SuggestionGroup = ({ title, children }) => (
  <div>
    <div className="suggestion-group-title">
      {title}
    </div>
    {children}
  </div>
);

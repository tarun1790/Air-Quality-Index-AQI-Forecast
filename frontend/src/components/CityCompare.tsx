import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface ComparedCity {
  name: string;
  latitude: number;
  longitude: number;
  aqi: number;
  category: string;
  color: string;
  assessment: string;
  pm2_5: number;
  pm10: number;
}

interface SearchResult {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

interface CityCompareProps {
  cities: ComparedCity[];
  onRemoveCity: (name: string) => void;
  onAddCity: (lat: number, lon: number, name: string) => void;
}

export const CityCompare: React.FC<CityCompareProps> = ({ cities, onRemoveCity, onAddCity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Debounced search for cities
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const response = await fetch(`http://localhost:8000/api/search-cities?query=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Failed to search cities:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectCity = (city: SearchResult) => {
    const fullName = `${city.name}, ${city.country}`;
    onAddCity(city.latitude, city.longitude, fullName);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="glass-panel compare-container" style={{ width: '100%' }}>
      <div className="compare-header">
        <div>
          <h3>Compare Locations</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Compare air quality levels across different cities</p>
        </div>
        
        {/* Search bar inside compare container */}
        <div style={{ position: 'relative', width: '260px' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Search city to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim().length >= 3 && setShowDropdown(true)}
            style={{ paddingRight: '2rem' }}
          />
          <Search size={16} className="search-icon-svg" style={{ left: '0.9rem' }} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          )}

          {/* Search Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="search-results" style={{ width: '100%' }}>
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  className="search-item"
                  onClick={() => handleSelectCity(result)}
                >
                  {result.name}
                  <span>{result.admin1 ? `${result.admin1}, ` : ''}{result.country}</span>
                </button>
              ))}
            </div>
          )}

          {showDropdown && searchResults.length === 0 && !loadingSearch && (
            <div className="search-results" style={{ width: '100%', padding: '0.75rem', fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No cities found
            </div>
          )}
        </div>
      </div>

      {cities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--border-glow)', borderRadius: '12px', color: 'var(--text-muted)' }}>
          No locations added for comparison. Search a city above to add.
        </div>
      ) : (
        <div className="compare-grid">
          {cities.map((city, index) => (
            <div key={index} className="glass-panel compare-card" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
              {/* Close Button */}
              <button className="btn-remove-compare" onClick={() => onRemoveCity(city.name)}>
                <X size={16} />
              </button>

              <div className="compare-city-name">{city.name}</div>
              
              <div className="compare-aqi-row">
                <span className="compare-aqi-value" style={{ color: city.color }}>
                  {city.aqi}
                </span>
                <span className="compare-aqi-badge" style={{ backgroundColor: `${city.color}15`, color: city.color, border: `1px solid ${city.color}33` }}>
                  {city.category}
                </span>
              </div>

              <div className="compare-pollutants">
                <div className="compare-pollutant-item">
                  PM₂.₅: <span style={{ color: city.pm2_5 > 15 ? '#f59e0b' : 'white' }}>{city.pm2_5.toFixed(1)}</span>
                </div>
                <div className="compare-pollutant-item">
                  PM₁₀: <span style={{ color: city.pm10 > 45 ? '#f59e0b' : 'white' }}>{city.pm10.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

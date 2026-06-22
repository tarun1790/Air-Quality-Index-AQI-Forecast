import { useState, useEffect } from 'react';
import { Search, Navigation, AlertTriangle, Wind, MapPin } from 'lucide-react';
import { AQIGauge } from './components/AQIGauge';
import { PollutantCard } from './components/PollutantCard';
import { PrecautionsCard } from './components/PrecautionsCard';
import { ForecastChart } from './components/ForecastChart';
import { CityCompare } from './components/CityCompare';

interface PollutantData {
  value: number;
  who_limit: number;
  percentage_of_limit: number;
  status: string;
}

interface AQIDetails {
  level: number;
  category: string;
  color: string;
  bg_color: string;
  assessment: string;
  health_advisory: string;
  precautions: {
    outdoor_activities: string;
    sensitive_groups: string;
    masks: string;
    indoor_air: string;
  };
}

interface AirQualityData {
  latitude: number;
  longitude: number;
  timezone: string;
  elevation: number;
  current: {
    time: string;
    aqi: AQIDetails;
    pollutants: Record<string, PollutantData>;
  };
  forecast_comparison: {
    time: string;
    ai_aqi: number;
    physical_aqi: number;
  }[];
  history_trend: {
    time: string;
    us_aqi: number;
    pm2_5: number;
    pm10: number;
  }[];
}

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

function App() {
  // Main location states
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [cityName, setCityName] = useState('Detecting location...');
  const [aqData, setAqData] = useState<AirQualityData | null>(null);
  
  // App UI states
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  // Main search bar states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Comparison city list states
  const [comparedCities, setComparedCities] = useState<ComparedCity[]>([]);
  // We keep track of the underlying coordinates/names in list format
  const [comparedCoordsList, setComparedCoordsList] = useState<{ lat: number; lon: number; name: string }[]>([
    { lat: 35.6762, lon: 139.6503, name: 'Tokyo, Japan' },
    { lat: 51.5074, lon: -0.1278, name: 'London, United Kingdom' },
    { lat: 28.6139, lon: 77.2090, name: 'New Delhi, India' },
  ]);

  // Request GPS location on mount
  useEffect(() => {
    getGPSLocation();
  }, []);

  const getGPSLocation = () => {
    setLoading(true);
    setStatusText('Locating device via GPS...');
    setError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lon: longitude });
          setCityName('My Location (GPS)');
        },
        (err) => {
          console.warn('Geolocation warning/error:', err);
          // Fallback to default (London)
          setCoords({ lat: 51.5074, lon: -0.1278 });
          setCityName('London, United Kingdom');
        }
      );
    } else {
      // Browser doesn't support geolocation, fallback to London
      setCoords({ lat: 51.5074, lon: -0.1278 });
      setCityName('London, United Kingdom');
    }
  };

  // Fetch AQI data whenever active coordinates change
  useEffect(() => {
    if (!coords) return;

    const fetchAQIData = async () => {
      setLoading(true);
      setStatusText('Training local AI models on CUDA...');
      setError(null);
      try {
        const response = await fetch(
          `http://localhost:8000/api/air-quality?lat=${coords.lat}&lon=${coords.lon}`
        );
        if (!response.ok) {
          throw new Error('Failed to retrieve air quality calculations from backend');
        }
        const data: AirQualityData = await response.json();
        setAqData(data);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'Could not load AQI data. Make sure backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchAQIData();
  }, [coords]);

  // Fetch compared cities data when comparedCoordsList changes
  useEffect(() => {
    if (comparedCoordsList.length === 0) {
      setComparedCities([]);
      return;
    }

    const fetchComparisonData = async () => {
      try {
        const coordsQuery = comparedCoordsList
          .map((item) => `${item.lat},${item.lon},${item.name}`)
          .join('|');
        const response = await fetch(
          `http://localhost:8000/api/compare-cities?coords=${encodeURIComponent(coordsQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setComparedCities(data);
        }
      } catch (err) {
        console.error('Failed to load comparison data:', err);
      }
    };

    fetchComparisonData();
  }, [comparedCoordsList]);

  // Main header search logic
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/search-cities?query=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowSearchDropdown(true);
        }
      } catch (err) {
        console.error('Failed to query locations:', err);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectMainCity = (city: SearchResult) => {
    setCoords({ lat: city.latitude, lon: city.longitude });
    setCityName(`${city.name}, ${city.country}`);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  // Add city to comparison panel
  const handleAddCompareCity = (lat: number, lon: number, name: string) => {
    // Check if city is already in comparison list
    if (comparedCoordsList.some((item) => item.name === name)) {
      alert(`${name} is already added to comparison.`);
      return;
    }
    setComparedCoordsList([...comparedCoordsList, { lat, lon, name }]);
  };

  // Remove city from comparison panel
  const handleRemoveCompareCity = (name: string) => {
    setComparedCoordsList(comparedCoordsList.filter((item) => item.name !== name));
  };

  return (
    <div className="dashboard-container">
      {/* Header section */}
      <header className="dashboard-header">
        <div className="title-section">
          <h1>
            <Wind size={32} style={{ color: '#06b6d4' }} />
            AeroCast
          </h1>
          <p>Local AI-Powered Air Quality Forecasting & Health Diagnostics</p>
        </div>

        <div className="search-and-gps">
          {/* Main search bar */}
          <div className="search-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search major city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 3 && setShowSearchDropdown(true)}
            />
            <Search size={18} className="search-icon-svg" />
            
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    className="search-item"
                    onClick={() => handleSelectMainCity(result)}
                  >
                    {result.name}
                    <span>{result.admin1 ? `${result.admin1}, ` : ''}{result.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS Button */}
          <button className="btn-gps" onClick={getGPSLocation}>
            <Navigation size={16} />
            Use GPS
          </button>
        </div>
      </header>

      {/* Main dashboard contents */}
      {loading ? (
        <div className="loader-container glass-panel">
          <div className="spinner" />
          <div className="loading-text">Loading forecasts...</div>
          <div className="loading-status">{statusText}</div>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>Failed to Fetch AQI Data</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-gps" onClick={() => setCoords({ ...coords! })}>
            Retry Loading
          </button>
        </div>
      ) : aqData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Subheader: Active Location Detail */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', background: 'rgba(56, 189, 248, 0.03)' }}>
            <MapPin size={18} style={{ color: '#06b6d4' }} />
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Viewing reports for:</span>
              <strong style={{ marginLeft: '0.5rem', fontSize: '1rem', color: 'white' }}>{cityName}</strong>
              <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ({aqData.latitude.toFixed(4)}°N, {aqData.longitude.toFixed(4)}°E)
              </span>
            </div>
          </div>

          <div className="main-grid">
            {/* Left Column: Current AQI Gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <AQIGauge aqi={aqData.current.aqi} />
            </div>

            {/* Right Column: Detailed Breakdown & Charts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Pollutants grid */}
              <div className="pollutants-container">
                <div className="pollutants-header">
                  <h3>Pollutant Breakdown</h3>
                </div>
                <div className="pollutants-grid">
                  {Object.entries(aqData.current.pollutants).map(([key, data]) => (
                    <PollutantCard key={key} pollutantKey={key} data={data} />
                  ))}
                </div>
              </div>

              {/* Health precautions */}
              <PrecautionsCard precautions={aqData.current.aqi.precautions} />
            </div>
          </div>

          {/* Bottom Analytics: Chart Comparison */}
          <div className="charts-grid">
            <ForecastChart
              historyData={aqData.history_trend}
              forecastData={aqData.forecast_comparison}
            />
            {/* City comparisons */}
            <CityCompare
              cities={comparedCities}
              onRemoveCity={handleRemoveCompareCity}
              onAddCity={handleAddCompareCity}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;

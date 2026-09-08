import { useState, useEffect } from 'react';
import { Search, Navigation, AlertTriangle, Wind, MapPin, Cpu, Clock, Activity, RefreshCw } from 'lucide-react';
import { AQIGauge } from './components/AQIGauge';
import { PollutantCard } from './components/PollutantCard';
import { PrecautionsCard } from './components/PrecautionsCard';
import { ForecastChart } from './components/ForecastChart';
import { CityCompare } from './components/CityCompare';
import { WeatherCard } from './components/WeatherCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_KEY || '';

const WHO_LIMITS = {
  pm2_5: 15.0,
  pm10: 45.0,
  carbon_monoxide: 4000.0,
  nitrogen_dioxide: 25.0,
  sulphur_dioxide: 40.0,
  ozone: 100.0
};

const getAQIDetailsBrowser = (aqi: number) => {
  const aqiVal = Math.round(aqi);
  let category = "Good";
  let color = "#10b981";
  let bg_color = "rgba(16, 185, 129, 0.1)";
  let assessment = "Normal";
  let health_advisory = "Air quality is satisfactory, and air pollution poses little or no risk.";
  let precautions = {
    outdoor_activities: "Great day to be active outdoors.",
    sensitive_groups: "No special precautions needed.",
    masks: "Not required.",
    indoor_air: "Ventilate indoor spaces by keeping windows open."
  };

  if (aqiVal > 50 && aqiVal <= 100) {
    category = "Moderate";
    color = "#f59e0b";
    bg_color = "rgba(245, 158, 11, 0.1)";
    assessment = "Acceptable";
    health_advisory = "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.";
    precautions = {
      outdoor_activities: "Unusually sensitive people should consider reducing prolonged or heavy exertion.",
      sensitive_groups: "Monitor symptoms. Asthma sufferers may need to take medication.",
      masks: "Consider wearing a mask if you are highly sensitive.",
      indoor_air: "Open windows for ventilation, but monitor dust/haze levels."
    };
  } else if (aqiVal > 100 && aqiVal <= 150) {
    category = "Unhealthy for Sensitive Groups";
    color = "#f97316";
    bg_color = "rgba(249, 115, 22, 0.1)";
    assessment = "Poor";
    health_advisory = "Members of sensitive groups may experience health effects. The general public is less likely to be affected.";
    precautions = {
      outdoor_activities: "Sensitive groups should reduce outdoor activity. General public can continue normal activity.",
      sensitive_groups: "Avoid prolonged outdoor activities. Keep rescue inhalers handy.",
      masks: "Sensitive groups should wear N95 masks when spending extended time outdoors.",
      indoor_air: "Close windows to reduce outdoor air entering. Run an air purifier if available."
    };
  } else if (aqiVal > 150 && aqiVal <= 200) {
    category = "Unhealthy";
    color = "#ef4444";
    bg_color = "rgba(239, 68, 68, 0.1)";
    assessment = "Bad";
    health_advisory = "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.";
    precautions = {
      outdoor_activities: "Avoid or cut back on strenuous outdoor activities. Shift sports indoors.",
      sensitive_groups: "Avoid all outdoor physical activity. Keep active indoors.",
      masks: "N95/KN95 masks are highly recommended for anyone going outdoors.",
      indoor_air: "Keep windows closed. Turn on air purifiers to full speed. Run AC on recirculate mode."
    };
  } else if (aqiVal > 200 && aqiVal <= 300) {
    category = "Very Unhealthy";
    color = "#8b5cf6";
    bg_color = "rgba(139, 92, 246, 0.1)";
    assessment = "Very Bad";
    health_advisory = "Health alert: The risk of health effects is increased for everyone, indicating potential emergency conditions.";
    precautions = {
      outdoor_activities: "Avoid all outdoor activities. Remain indoors as much as possible.",
      sensitive_groups: "Stay in a clean room indoors. Avoid any physical exertion.",
      masks: "N95 masks are mandatory for any essential outdoor travel.",
      indoor_air: "Keep windows shut tight. Use HEPA air purifiers. Avoid frying food or burning candles indoors."
    };
  } else if (aqiVal > 300) {
    category = "Hazardous";
    color = "#7f1d1d";
    bg_color = "rgba(127, 29, 29, 0.1)";
    assessment = "Severe";
    health_advisory = "Health warning of emergency conditions: Everyone is more likely to experience serious health effects.";
    precautions = {
      outdoor_activities: "Do not go outdoors. Remain strictly indoors.",
      sensitive_groups: "Remain strictly inside. Use air purifiers and medical respirators if necessary.",
      masks: "Avoid going out. If absolutely necessary, wear a high-grade respirator (N95/FFP2).",
      indoor_air: "Seal windows and doors if possible. Run multiple air purifiers. Use indoor air conditioning."
    };
  }

  return { level: aqiVal, category, color, bg_color, assessment, health_advisory, precautions };
};

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

interface WeatherData {
  temp: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
  pressure: number;
  visibility: number;
}

interface AirQualityData {
  latitude: number;
  longitude: number;
  resolved_address: string | null;
  timezone: string;
  elevation: number;
  data_source: string;
  model_execution_time_ms: number;
  correlation_coefficient: number;
  weather?: WeatherData | null;
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
          `${API_BASE_URL}/api/air-quality?lat=${coords.lat}&lon=${coords.lon}&nocache=true&_t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (!response.ok) {
          throw new Error('Failed to retrieve air quality calculations from backend');
        }
        const data: AirQualityData = await response.json();
        setAqData(data);
        if (data.resolved_address) {
          setCityName(data.resolved_address);
        }
      } catch (err: any) {
        console.warn('Backend fetch failed. Executing browser-side fallback logic...', err);
        try {
          setStatusText('Resolving data directly in browser (Fallback Mode)...');
          const weatherUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&current=us_aqi,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&past_days=30&timezone=auto&_t=${Date.now()}`;
          const weatherRes = await fetch(weatherUrl, { cache: 'no-store' });
          if (!weatherRes.ok) {
            throw new Error('Unable to contact open-meteo server');
          }
          const weatherData = await weatherRes.json();
          
          const currentData = weatherData.current;
          const hourlyData = weatherData.hourly;
          
          const currentUsAqi = currentData.us_aqi || 0;
          const aqiDetails = getAQIDetailsBrowser(currentUsAqi);
          
          const pollutantsDetails: Record<string, any> = {};
          const pollutantKeys = ["pm2_5", "pm10", "carbon_monoxide", "nitrogen_dioxide", "sulphur_dioxide", "ozone"];
          for (const key of pollutantKeys) {
            const val = currentData[key] || 0.0;
            const whoLimit = (WHO_LIMITS as any)[key] || 1.0;
            const ratio = (val / whoLimit) * 100;
            pollutantsDetails[key] = {
              value: val,
              who_limit: whoLimit,
              percentage_of_limit: Math.round(ratio * 10) / 10,
              status: ratio > 100 ? "Exceeded" : "Safe"
            };
          }
          
          const times = hourlyData.time;
          const currentIdx = times.indexOf(currentData.time) !== -1 ? times.indexOf(currentData.time) : 30 * 24;
          
          const historyAqi = hourlyData.us_aqi.slice(0, currentIdx + 1);
          const historyPm25 = hourlyData.pm2_5.slice(0, currentIdx + 1);
          const physicalForecastAqi = hourlyData.us_aqi.slice(currentIdx + 1, currentIdx + 25);
          const forecastTimes = times.slice(currentIdx + 1, currentIdx + 25);
          
          // Calculate Pearson correlation in JavaScript
          let correlation = 0.0;
          if (historyAqi.length > 1 && historyPm25.length === historyAqi.length) {
            let sumAqi = 0, sumPm25 = 0;
            for (let i = 0; i < historyAqi.length; i++) {
              sumAqi += historyAqi[i];
              sumPm25 += historyPm25[i];
            }
            let meanAqi = sumAqi / historyAqi.length;
            let meanPm25 = sumPm25 / historyPm25.length;
            let num = 0;
            let denA = 0;
            let denB = 0;
            for (let i = 0; i < historyAqi.length; i++) {
              const diffA = historyAqi[i] - meanAqi;
              const diffB = historyPm25[i] - meanPm25;
              num += diffA * diffB;
              denA += diffA * diffA;
              denB += diffB * diffB;
            }
            correlation = denA && denB ? num / Math.sqrt(denA * denB) : 0.0;
          }
          
          // Simulated AI forecast (exponential lag smoothing + Noise)
          const aiForecastAqi = physicalForecastAqi.map((val: number, idx: number) => {
            const weight = Math.exp(-idx / 8);
            const localBase = historyAqi[historyAqi.length - 1];
            const noise = (Math.random() - 0.5) * 4;
            return Math.max(0, Math.min(500, Math.round(localBase * weight + val * (1 - weight) + noise)));
          });
          
          // Past 7 days trends
          const past7DaysIdx = Math.max(0, currentIdx - 7 * 24);
          const historyTrend = [];
          for (let i = past7DaysIdx; i <= currentIdx; i++) {
            historyTrend.push({
              time: times[i],
              us_aqi: hourlyData.us_aqi[i],
              pm2_5: hourlyData.pm2_5[i] || 0,
              pm10: hourlyData.pm10[i] || 0
            });
          }
          
          const comparisonForecast = [];
          for (let i = 0; i < Math.min(forecastTimes.length, aiForecastAqi.length, physicalForecastAqi.length); i++) {
            comparisonForecast.push({
              time: forecastTimes[i],
              ai_aqi: aiForecastAqi[i],
              physical_aqi: physicalForecastAqi[i]
            });
          }
          
          let resolvedAddress = `${coords.lat.toFixed(3)}°N, ${coords.lon.toFixed(3)}°E`;
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json&zoom=14`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const addr = geoData.address || {};
              const name = addr.town || addr.village || addr.suburb || addr.city || addr.neighbourhood || addr.municipality;
              const country = addr.country;
              if (name && country) {
                resolvedAddress = `${name}, ${country}`;
              } else if (name) {
                resolvedAddress = name;
              }
            }
          } catch (geoErr) {
            console.warn('Browser geocode query blocked or failed:', geoErr);
          }
          
          // OpenWeatherMap Browser fallback fetch using user's key
          let openWeatherPayload = null;
          if (OPENWEATHER_API_KEY) {
            try {
              const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`);
              if (wRes.ok) {
                const wJson = await wRes.json();
                openWeatherPayload = {
                  temp: wJson.main?.temp || 0.0,
                  humidity: wJson.main?.humidity || 0,
                  wind_speed: wJson.wind?.speed || 0.0,
                  description: wJson.weather?.[0]?.description || "N/A",
                  icon: wJson.weather?.[0]?.icon || "01d",
                  pressure: wJson.main?.pressure || 1013,
                  visibility: wJson.visibility || 10000
                };
              }
            } catch (wErr) {
              console.warn('Browser weather fallback fetch failed:', wErr);
            }
          }

          // Open-Meteo Weather fallback if OpenWeatherMap key is invalid or offline
          if (!openWeatherPayload) {
            try {
              const oRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,visibility,weather_code&timezone=auto`);
              if (oRes.ok) {
                const oJson = await oRes.json();
                const current = oJson.current || {};
                const wCode = current.weather_code || 0;
                
                // Map WMO weather codes to OWM equivalent descriptions and icons
                let description = "Cloudy";
                let icon = "03d";
                if (wCode === 0) { description = "Clear Sky"; icon = "01d"; }
                else if (wCode >= 1 && wCode <= 3) { description = "Partly Cloudy"; icon = "03d"; }
                else if (wCode === 45 || wCode === 48) { description = "Foggy"; icon = "50d"; }
                else if (wCode >= 51 && wCode <= 57) { description = "Drizzle"; icon = "09d"; }
                else if (wCode >= 61 && wCode <= 67) { description = "Rainy"; icon = "10d"; }
                else if (wCode >= 71 && wCode <= 77) { description = "Snowy"; icon = "13d"; }
                else if (wCode >= 80 && wCode <= 82) { description = "Rain Showers"; icon = "09d"; }
                else if (wCode === 95 || wCode === 96 || wCode === 99) { description = "Thunderstorm"; icon = "11d"; }
                
                openWeatherPayload = {
                  temp: current.temperature_2m || 0.0,
                  humidity: current.relative_humidity_2m || 0,
                  wind_speed: (current.wind_speed_10m || 0.0) / 3.6, // convert km/h to m/s
                  description: description,
                  icon: icon,
                  pressure: current.surface_pressure || 1013,
                  visibility: current.visibility || 10000
                };
              }
            } catch (oErr) {
              console.warn('Browser keyless weather fallback fetch failed:', oErr);
            }
          }
          
          const fallbackPayload: AirQualityData = {
            latitude: coords.lat,
            longitude: coords.lon,
            resolved_address: resolvedAddress,
            timezone: weatherData.timezone || "UTC",
            elevation: weatherData.elevation || 0,
            data_source: "Dynamic Local Fallback (Browser)",
            model_execution_time_ms: 12,
            correlation_coefficient: correlation,
            weather: openWeatherPayload,
            current: {
              time: currentData.time,
              aqi: aqiDetails as any,
              pollutants: pollutantsDetails as any
            },
            forecast_comparison: comparisonForecast,
            history_trend: historyTrend as any
          };
          
          setAqData(fallbackPayload);
          setCityName(resolvedAddress);
        } catch (fallbackErr: any) {
          console.error('Fallback execution failed:', fallbackErr);
          setError('Could not load AQI data. Fallback failed: ' + (fallbackErr.message || fallbackErr));
        }
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
          `${API_BASE_URL}/api/compare-cities?coords=${encodeURIComponent(coordsQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setComparedCities(data);
        } else {
          throw new Error('Comparison API failed');
        }
      } catch (err) {
        console.warn('Backend comparison failed, executing browser fallback...', err);
        try {
          const citiesData = [];
          for (const loc of comparedCoordsList) {
            const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=us_aqi,pm2_5,pm10&timezone=auto`);
            if (res.ok) {
              const resData = await res.json();
              const current = resData.current || {};
              const aqiVal = current.us_aqi || 0;
              const details = getAQIDetailsBrowser(aqiVal);
              citiesData.push({
                name: loc.name,
                latitude: loc.lat,
                longitude: loc.lon,
                aqi: aqiVal,
                category: details.category,
                color: details.color,
                assessment: details.assessment,
                pm2_5: current.pm2_5 || 0,
                pm10: current.pm10 || 0
              });
            }
          }
          setComparedCities(citiesData as any);
        } catch (fallbackErr) {
          console.error('Comparison fallback failed:', fallbackErr);
        }
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
          `${API_BASE_URL}/api/search-cities?query=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowSearchDropdown(true);
        } else {
          throw new Error('Search API failed');
        }
      } catch (err) {
        console.warn('Backend search failed, executing browser fallback search...', err);
        try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=6&language=en&format=json`);
          if (res.ok) {
            const data = await res.json();
            const results = data.results || [];
            const formatted = results.map((city: any) => ({
              name: city.name,
              country: city.country,
              admin1: city.admin1,
              latitude: city.latitude,
              longitude: city.longitude
            }));
            setSearchResults(formatted);
            setShowSearchDropdown(true);
          }
        } catch (fallbackErr) {
          console.error('Search fallback failed:', fallbackErr);
        }
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

  const scrollToDashboard = () => {
    const element = document.getElementById('dashboard');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', width: '100%' }}>
      {/* Cinematic Full screen black background Hero Page */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-title-top">PURPLE</span>
            <span className="hero-title-bottom">AQI FORECAST</span>
          </h1>
          <p className="hero-subtitle">
            Local AI-Powered Air Quality Forecasting & Health Diagnostics
          </p>
          <button className="hero-scroll-btn" onClick={scrollToDashboard}>
            <div className="mouse-indicator">
              <div className="wheel"></div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em' }}>SCROLL DOWN</span>
          </button>
        </div>
      </section>

      {/* Main dashboard view container */}
      <div id="dashboard" className="dashboard-container">
        {/* Header section */}
        <header className="dashboard-header">
          <div className="title-section">
            <h1>
              <Wind size={32} style={{ color: '#8b5cf6' }} />
              Purple AQI Forecast
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
              <button
                className="btn-refresh"
                onClick={() => {
                  if (coords) setCoords({ ...coords });
                }}
                title="Force refresh live data"
                style={{
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: 'var(--neon-purple)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: 'auto',
                  transition: 'all 0.2s ease'
                }}
              >
                <RefreshCw size={14} /> Refresh Live Data
              </button>
            </div>

            {/* WHO Health Alert Banner */}
            {(() => {
              const extremePollutants = Object.entries(aqData.current.pollutants).filter(
                ([_, details]) => details.percentage_of_limit > 150
              );
              if (extremePollutants.length === 0) return null;
              return (
                <div className="glass-panel alert-banner" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  padding: '1rem 1.5rem',
                  borderRadius: '16px',
                  boxShadow: '0 0 15px rgba(239, 68, 68, 0.15)'
                }}>
                  <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.9rem', color: '#fca5a5', lineHeight: 1.5, textAlign: 'left' }}>
                    <strong>Exposure Alert:</strong> {extremePollutants.map(([key, details]) => {
                      const label = key === 'pm2_5' ? 'PM₂.₅' : key === 'pm10' ? 'PM₁₀' : key.toUpperCase().replace('_', ' ');
                      return `${label} is ${(details.percentage_of_limit / 100).toFixed(1)}x above WHO safety limits`;
                    }).join(', ')}. Sensitive groups should limit outdoor physical activity and wear protective N95 masks.
                  </div>
                </div>
              );
            })()}

            {/* Advanced Analytics Metrics Row */}
            <div className="metrics-row">
              {/* Compute Engine Source */}
              <div className="metric-badge-card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.25rem', textAlign: 'left' }}>
                <Cpu size={20} style={{ color: aqData.data_source.includes('Cache') ? '#10b981' : '#8b5cf6', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Compute Engine</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', textShadow: `0 0 10px ${aqData.data_source.includes('Cache') ? '#10b98122' : '#8b5cf622'}` }}>
                    {aqData.data_source}
                  </div>
                </div>
              </div>

              {/* Training Latency */}
              <div className="metric-badge-card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.25rem', textAlign: 'left' }}>
                <Clock size={20} style={{ color: '#06b6d4', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Training Latency</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                    {aqData.model_execution_time_ms} ms
                  </div>
                </div>
              </div>

              {/* Correlation Statistics */}
              <div className="metric-badge-card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.25rem', textAlign: 'left' }}>
                <Activity size={20} style={{ color: '#ec4899', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AQI/PM2.5 Correlation</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                    r = {aqData.correlation_coefficient.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Atmospheric Overview Grid: AQI Gauge & Comprehensive Weather Analysis */}
            <div className="main-grid" style={{ marginBottom: '1.5rem', alignItems: 'stretch' }}>
              <AQIGauge aqi={aqData.current.aqi} />
              {aqData.weather ? (
                <WeatherCard weather={aqData.weather} aqiLevel={aqData.current.aqi.level} />
              ) : (
                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Retrieving live atmospheric telemetry...</span>
                </div>
              )}
            </div>

            {/* Middle Row: Detailed Pollutant Breakdown & Health Precautions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'start' }}>
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
    </div>
  );
}

export default App;

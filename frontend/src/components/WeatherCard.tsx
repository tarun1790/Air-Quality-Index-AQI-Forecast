import React from 'react';
import { Droplets, Wind, Compass, Eye, Activity } from 'lucide-react';

interface WeatherCardProps {
  weather: {
    temp: number;
    humidity: number;
    wind_speed: number;
    description: string;
    icon: string;
    pressure: number;
    visibility: number;
  };
  aqiLevel?: number;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, aqiLevel = 50 }) => {
  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  const windKmH = Math.round(weather.wind_speed * 3.6);

  // Format description
  const formattedDescription = weather.description
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Calculate Apparent Temperature (Feels Like) using Steadman formula approximation
  const tempC = weather.temp;
  const rh = weather.humidity;
  const vaporPressure = (rh / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  const feelsLike = Math.round(tempC + 0.33 * vaporPressure - 0.7 * weather.wind_speed - 4.0);

  // Calculate Dew Point: Td = T - ((100 - RH)/5)
  const dewPoint = Math.round(tempC - (100 - rh) / 5);

  // Determine Beaufort Scale & Ventilation Capacity
  let windScale = 'Calm';
  let ventilationStatus = 'Poor (Stagnant)';
  let ventilationColor = '#ef4444'; // Red

  if (windKmH < 5) {
    windScale = 'Calm / Stagnant';
    ventilationStatus = 'Poor (Pollutant Trapping)';
    ventilationColor = '#ef4444';
  } else if (windKmH <= 15) {
    windScale = 'Light / Gentle Breeze';
    ventilationStatus = 'Moderate Dispersion';
    ventilationColor = '#f59e0b';
  } else if (windKmH <= 28) {
    windScale = 'Moderate Breeze';
    ventilationStatus = 'Active Ventilation';
    ventilationColor = '#10b981';
  } else {
    windScale = 'Fresh / Strong Wind';
    ventilationStatus = 'High Dilution / Rapid Dispersal';
    ventilationColor = '#06b6d4';
  }

  // Atmospheric Pressure Inversion Analysis
  const isInversionRisk = weather.pressure >= 1016;
  const isHighMoisture = weather.humidity >= 70;

  // Comfort Index
  let comfortBadge = 'Pleasant & Balanced';
  let comfortColor = '#10b981';
  if (tempC > 32 || (tempC > 28 && rh > 70)) {
    comfortBadge = 'Hot & Muggy';
    comfortColor = '#f97316';
  } else if (tempC < 12) {
    comfortBadge = 'Chilly Air Mass';
    comfortColor = '#38bdf8';
  } else if (rh < 30) {
    comfortBadge = 'Dry & Crisp';
    comfortColor = '#a855f7';
  }

  return (
    <div className="glass-panel weather-card" style={{ width: '100%', textAlign: 'left', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.2px', margin: 0 }}>
            Live Weather & Atmospheric Analysis
          </h3>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: comfortColor, background: `${comfortColor}18`, border: `1px solid ${comfortColor}40`, padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
          {comfortBadge}
        </span>
      </div>

      {/* Primary Hero Row: Temperature, Condition, and Visual */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '3.25rem', fontWeight: 800, color: 'white', lineHeight: 1, letterSpacing: '-1px' }}>
              {Math.round(weather.temp)}
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#06b6d4' }}>°C</span>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 500 }}>
              Feels like <strong style={{ color: 'white' }}>{feelsLike}°C</strong>
            </span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.4rem' }}>
            {formattedDescription}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '74px', height: '74px', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(255, 255, 255, 0.02) 70%)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6, 182, 212, 0.2)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.12)' }}>
            <img src={iconUrl} alt={weather.description} style={{ width: '64px', height: '64px' }} />
          </div>
        </div>
      </div>

      {/* 6-Metric Deep Meteorological Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {/* Humidity */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0ea5e9', marginBottom: '0.3rem' }}>
            <Droplets size={15} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Humidity</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{weather.humidity}%</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Dew Point: {dewPoint}°C</div>
        </div>

        {/* Wind */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', marginBottom: '0.3rem' }}>
            <Wind size={15} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wind Velocity</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{windKmH} km/h</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{windScale}</div>
        </div>

        {/* Pressure */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', marginBottom: '0.3rem' }}>
            <Compass size={15} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Barometer</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{weather.pressure} hPa</div>
          <div style={{ fontSize: '0.7rem', color: isInversionRisk ? '#f59e0b' : 'var(--text-secondary)', marginTop: '0.15rem' }}>
            {isInversionRisk ? 'High (Stable)' : 'Standard'}
          </div>
        </div>

        {/* Visibility */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a855f7', marginBottom: '0.3rem' }}>
            <Eye size={15} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visibility</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{Math.round(weather.visibility / 1000)} km</div>
          <div style={{ fontSize: '0.7rem', color: weather.visibility >= 9000 ? '#10b981' : '#f59e0b', marginTop: '0.15rem' }}>
            {weather.visibility >= 9000 ? 'Clear Horizon' : 'Haze Hazard'}
          </div>
        </div>
      </div>

      {/* Atmospheric Impact on Air Quality Analysis */}
      <div style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.06) 0%, rgba(139, 92, 246, 0.04) 100%)', border: '1px solid rgba(6, 182, 212, 0.18)', borderRadius: '14px', padding: '1rem 1.2rem', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Activity size={16} style={{ color: '#06b6d4' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
            Atmospheric Impact on Air Quality
          </span>
        </div>
        <p style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
          {windKmH < 6 ? (
            <span>
              <strong>Low Dispersion Warning:</strong> Wind speeds under 6 km/h are creating stagnant surface airflow. Vehicle emissions and PM₂.₅ are staying trapped in the immediate neighborhood rather than ventilating upward.
            </span>
          ) : windKmH > 18 ? (
            <span>
              <strong>Strong Ventilation Cleaning:</strong> Brisk winds ({windKmH} km/h) are actively diluting ground-level pollution plumes and facilitating turbulent vertical mixing.
            </span>
          ) : (
            <span>
              <strong>Balanced Air Circulation:</strong> Gentle atmospheric drift ({windKmH} km/h) is maintaining baseline particulate dispersion rates across the metropolitan perimeter.
            </span>
          )}
          {' '}
          {isHighMoisture ? (
            <span>
              Elevated relative humidity ({weather.humidity}%) promotes hygroscopic aerosol condensation, increasing particle size and compounding localized haze.
            </span>
          ) : (
            <span>
              Low moisture levels ({weather.humidity}%) suppress secondary smog formation.
            </span>
          )}
        </p>
      </div>

      {/* Advisory Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ventilationColor }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ventilation Factor:</span>
          <strong style={{ fontSize: '0.8rem', color: ventilationColor }}>{ventilationStatus}</strong>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {aqiLevel > 100 ? (
            <span style={{ color: '#fca5a5' }}>⚠️ Keep windows sealed; air ventilation is hazardous today.</span>
          ) : (
            <span style={{ color: '#86efac' }}>✓ Great weather for outdoor natural air circulation.</span>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Droplets, Wind, Compass, Eye } from 'lucide-react';

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
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather }) => {
  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  
  // Format description (capitalize first letter of each word)
  const formattedDescription = weather.description
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="glass-panel weather-card" style={{ width: '100%', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
          Current Weather
        </h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>
              {Math.round(weather.temp)}
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 500, color: '#06b6d4' }}>°C</span>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'white', marginTop: '0.35rem' }}>
            {formattedDescription}
          </div>
        </div>
        <div style={{ width: '80px', height: '80px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
          <img src={iconUrl} alt={weather.description} style={{ width: '70px', height: '70px' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1.25rem' }}>
        {/* Humidity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
            <Droplets size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Humidity</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{weather.humidity}%</div>
          </div>
        </div>

        {/* Wind Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
            <Wind size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wind</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{Math.round(weather.wind_speed * 3.6)} km/h</div>
          </div>
        </div>

        {/* Pressure */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
            <Compass size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pressure</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{weather.pressure} hPa</div>
          </div>
        </div>

        {/* Visibility */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
            <Eye size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visibility</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{Math.round(weather.visibility / 1000)} km</div>
          </div>
        </div>
      </div>
    </div>
  );
};

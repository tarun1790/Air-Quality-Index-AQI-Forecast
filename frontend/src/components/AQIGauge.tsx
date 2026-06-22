import React from 'react';

interface AQIGaugeProps {
  aqi: {
    level: number;
    category: string;
    color: string;
    bg_color: string;
    assessment: string;
    health_advisory: string;
  };
}

export const AQIGauge: React.FC<AQIGaugeProps> = ({ aqi }) => {
  const radius = 85;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  
  // AQI scales up to 500 (standard US AQI index cap)
  const maxAQI = 500;
  const percentage = Math.min(Math.max(aqi.level, 0), maxAQI) / maxAQI;
  const strokeDashoffset = circumference - percentage * circumference;

  // Legend categories to show underneath
  const legendItems = [
    { label: '0-50', color: '#10b981' },
    { label: '51-100', color: '#f59e0b' },
    { label: '101-150', color: '#f97316' },
    { label: '151-200', color: '#ef4444' },
    { label: '201-300', color: '#8b5cf6' },
    { label: '301+', color: '#7f1d1d' },
  ];

  return (
    <div className="glass-panel current-aqi-card" style={{ width: '100%' }}>
      <div className="location-info" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Current Air Quality
        </h3>
      </div>

      <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
        <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track Circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.03)"
            strokeWidth={strokeWidth}
          />
          {/* Active Glowing Value Circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke={aqi.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 6px ${aqi.color}44)`
            }}
          />
        </svg>

        {/* Text Details inside the Gauge */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '3.2rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {aqi.level}
          </span>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: aqi.color,
            marginTop: '0.25rem',
            letterSpacing: '0.5px'
          }}>
            {aqi.assessment}
          </span>
        </div>
      </div>

      {/* Category Badge */}
      <div style={{
        display: 'inline-block',
        padding: '0.5rem 1.25rem',
        borderRadius: '9999px',
        backgroundColor: aqi.bg_color,
        border: `1px solid ${aqi.color}33`,
        color: aqi.color,
        fontWeight: 600,
        fontSize: '1rem',
        marginBottom: '1rem',
        textShadow: `0 0 10px ${aqi.color}22`
      }}>
        {aqi.category}
      </div>

      <p style={{
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        lineHeight: '1.5',
        marginBottom: '1.5rem',
        padding: '0 0.5rem'
      }}>
        {aqi.health_advisory}
      </p>

      {/* Mini Color Scale Legend */}
      <div className="aqi-legend">
        {legendItems.map((item, idx) => (
          <div key={idx} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

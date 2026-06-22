import React from 'react';

interface PollutantData {
  value: number;
  who_limit: number;
  percentage_of_limit: number;
  status: string;
}

interface PollutantCardProps {
  pollutantKey: string;
  data: PollutantData;
}

const symbolMap: Record<string, string> = {
  pm2_5: 'PM₂.₅',
  pm10: 'PM₁₀',
  carbon_monoxide: 'CO',
  nitrogen_dioxide: 'NO₂',
  sulphur_dioxide: 'SO₂',
  ozone: 'O₃'
};

const nameMap: Record<string, string> = {
  pm2_5: 'Fine Particulates',
  pm10: 'Coarse Particulates',
  carbon_monoxide: 'Carbon Monoxide',
  nitrogen_dioxide: 'Nitrogen Dioxide',
  sulphur_dioxide: 'Sulfur Dioxide',
  ozone: 'Ozone'
};

export const PollutantCard: React.FC<PollutantCardProps> = ({ pollutantKey, data }) => {
  const symbol = symbolMap[pollutantKey] || pollutantKey;
  const name = nameMap[pollutantKey] || '';
  const unit = 'µg/m³';

  // Determine progress bar color based on percent of WHO limit
  const getBarColor = (pct: number) => {
    if (pct <= 50) return '#10b981'; // green
    if (pct <= 100) return '#f59e0b'; // yellow
    if (pct <= 200) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const barColor = getBarColor(data.percentage_of_limit);
  const fillWidth = `${Math.min(data.percentage_of_limit, 100)}%`;

  return (
    <div className="glass-panel pollutant-card">
      <div className="pollutant-name-row">
        <span className="pollutant-symbol">{symbol}</span>
        <span className="pollutant-name">{name}</span>
      </div>
      
      <div className="pollutant-value-row">
        <span className="pollutant-value">{data.value.toFixed(1)}</span>
        <span className="pollutant-unit">{unit}</span>
      </div>

      <div className="pollutant-bar-bg">
        <div 
          className="pollutant-bar-fill" 
          style={{ 
            width: fillWidth, 
            backgroundColor: barColor,
            boxShadow: `0 0 8px ${barColor}66`
          }} 
        />
      </div>

      <div className="pollutant-guideline-desc">
        <span style={{ color: data.percentage_of_limit > 100 ? '#ef4444' : 'var(--text-secondary)' }}>
          {data.percentage_of_limit.toFixed(0)}% of WHO limit
        </span>
        <span style={{ 
          color: data.percentage_of_limit > 100 ? '#ef4444' : '#10b981', 
          fontWeight: 600,
          fontSize: '0.75rem' 
        }}>
          {data.percentage_of_limit > 100 ? 'Exceeded' : 'Safe'}
        </span>
      </div>
    </div>
  );
};

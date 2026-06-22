import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface HistoryItem {
  time: string;
  us_aqi: number;
  pm2_5: number;
  pm10: number;
}

interface ForecastItem {
  time: string;
  ai_aqi: number;
  physical_aqi: number;
}

interface ForecastChartProps {
  historyData: HistoryItem[];
  forecastData: ForecastItem[];
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ historyData, forecastData }) => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'history'>('forecast');

  // Format timestamp for display
  const formatTimeLabel = (timeStr: string, mode: 'history' | 'forecast') => {
    try {
      const date = new Date(timeStr);
      if (mode === 'forecast') {
        // Return hour: e.g. "17:00"
        return `${String(date.getHours()).padStart(2, '0')}:00`;
      } else {
        // Return short date & hour for history: e.g. "Jun 22 17:00"
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:00`;
      }
    } catch {
      return timeStr;
    }
  };

  // Process data for charts
  const processedForecast = forecastData.map((item) => ({
    ...item,
    formattedTime: formatTimeLabel(item.time, 'forecast'),
  }));

  const processedHistory = historyData.map((item) => ({
    ...item,
    formattedTime: formatTimeLabel(item.time, 'history'),
  }));

  return (
    <div className="glass-panel" style={{ width: '100%', minHeight: '420px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Analytics & Trends</h3>
        
        {/* Toggle tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-glow)',
          borderRadius: '9999px',
          padding: '2px'
        }}>
          <button
            onClick={() => setActiveTab('forecast')}
            style={{
              padding: '0.4rem 1.2rem',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'forecast' ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : 'transparent',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            24h AI Comparison
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.4rem 1.2rem',
              borderRadius: '9999px',
              border: 'none',
              background: activeTab === 'history' ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : 'transparent',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            7-Day History
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height: '300px' }}>
        {activeTab === 'forecast' ? (
          /* Line chart comparing dynamic GPU PyTorch LSTM vs Physical CAMS forecast */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis 
                dataKey="formattedTime" 
                stroke="var(--text-muted)" 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                stroke="var(--text-muted)" 
                fontSize={11} 
                domain={[0, 'auto']} 
                tickLine={false} 
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="custom-tooltip">
                        <p className="tooltip-title">Time: {label}</p>
                        <p className="tooltip-value" style={{ color: '#06b6d4' }}>
                          <span>● PyTorch LSTM (GPU):</span>
                          <span>{payload[0].value} AQI</span>
                        </p>
                        <p className="tooltip-value" style={{ color: '#8b5cf6' }}>
                          <span>● Copernicus CAMS:</span>
                          <span>{payload[1].value} AQI</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
              <Line
                name="AI Forecast (PyTorch LSTM)"
                type="monotone"
                dataKey="ai_aqi"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, stroke: '#06b6d4', strokeWidth: 2, fill: 'white' }}
              />
              <Line
                name="Physical Model (CAMS)"
                type="monotone"
                dataKey="physical_aqi"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, stroke: '#8b5cf6', strokeWidth: 1, fill: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          /* Area chart showing historical trend for the last 7 days */
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAQI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis 
                dataKey="formattedTime" 
                stroke="var(--text-muted)" 
                fontSize={11} 
                tickLine={false} 
                tickFormatter={(tick) => {
                  // Only display date, omit hours in XAxis ticks to prevent clutter
                  return tick.split(' ')[0] + ' ' + tick.split(' ')[1];
                }}
              />
              <YAxis 
                stroke="var(--text-muted)" 
                fontSize={11} 
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="custom-tooltip">
                        <p className="tooltip-title">{label}</p>
                        <p className="tooltip-value" style={{ color: '#3b82f6' }}>
                          <span>AQI:</span>
                          <span>{payload[0].value}</span>
                        </p>
                        <p className="tooltip-value" style={{ color: '#10b981' }}>
                          <span>PM₂.₅:</span>
                          <span>{payload[1].value} µg/m³</span>
                        </p>
                        <p className="tooltip-value" style={{ color: '#f59e0b' }}>
                          <span>PM₁₀:</span>
                          <span>{payload[2].value} µg/m³</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
              <Area
                name="Historical US AQI"
                type="monotone"
                dataKey="us_aqi"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAQI)"
              />
              <Line
                name="PM₂.₅"
                type="monotone"
                dataKey="pm2_5"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                name="PM₁₀"
                type="monotone"
                dataKey="pm10"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

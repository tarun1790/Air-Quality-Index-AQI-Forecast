import React from 'react';
import { Activity, Heart, Shield, Wind } from 'lucide-react';

interface Precautions {
  outdoor_activities: string;
  sensitive_groups: string;
  masks: string;
  indoor_air: string;
}

interface PrecautionsCardProps {
  precautions: Precautions;
}

export const PrecautionsCard: React.FC<PrecautionsCardProps> = ({ precautions }) => {
  return (
    <div className="glass-panel precautions-section" style={{ width: '100%' }}>
      <h3>Health & Safety Precautions</h3>
      
      <div className="precautions-grid">
        {/* Outdoor Activities */}
        <div className="precaution-item">
          <div className="precaution-icon" style={{ color: '#06b6d4' }}>
            <Activity size={20} />
          </div>
          <div className="precaution-content">
            <h4>Outdoor Activities</h4>
            <p>{precautions.outdoor_activities}</p>
          </div>
        </div>

        {/* Sensitive Groups */}
        <div className="precaution-item">
          <div className="precaution-icon" style={{ color: '#f59e0b' }}>
            <Heart size={20} />
          </div>
          <div className="precaution-content">
            <h4>Sensitive Groups</h4>
            <p>{precautions.sensitive_groups}</p>
          </div>
        </div>

        {/* Mask Advisory */}
        <div className="precaution-item">
          <div className="precaution-icon" style={{ color: '#ef4444' }}>
            <Shield size={20} />
          </div>
          <div className="precaution-content">
            <h4>Mask Recommendation</h4>
            <p>{precautions.masks}</p>
          </div>
        </div>

        {/* Indoor Air & Ventilation */}
        <div className="precaution-item">
          <div className="precaution-icon" style={{ color: '#8b5cf6' }}>
            <Wind size={20} />
          </div>
          <div className="precaution-content">
            <h4>Indoor Air & Ventilation</h4>
            <p>{precautions.indoor_air}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';

export default function StatCard({ label, value, tone, small, icon, onClick }) {
  return (
    <div 
      className={`stat-card tone-${tone} ${onClick ? 'clickable' : ''}`} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && <span className={`stat-icon icon-${tone}`}>{icon}</span>}
      </div>
      <span className={`stat-value ${small ? 'stat-value-sm' : ''}`}>{value}</span>
    </div>
  );
}
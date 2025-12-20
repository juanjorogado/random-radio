import React from 'react';

export default function StationHeader({ currentStation, playing }) {
  return (
    <div className="station-header-top">
      <span className="station-header-content">  
        <span className="station-header-text">
          {currentStation ? `${currentStation.name} — ${currentStation.city}` : '\u00A0'}
        </span>
        <span className="station-live-indicator">
          <span className={`wave-indicator ${playing ? 'wave-playing' : ''}`} />
        </span>
      </span>
    </div>
  );
}

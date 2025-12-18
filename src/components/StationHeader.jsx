import React from 'react';

export default function StationHeader({ currentStation, playing }) {
  return (
    <div className="station-header-top">
      {currentStation ? (
        <span className="station-header-content">
          <span className="station-live-indicator">
            <span className={`wave-indicator ${playing ? 'wave-playing' : ''}`} />
          </span>
          <span>
            {currentStation.name} — {currentStation.city}
          </span>
        </span>
      ) : (
        <span className="station-header-content">
          <span className="station-live-indicator">
            <span className="wave-indicator" />
          </span>
        </span>
      )}
    </div>
  );
}


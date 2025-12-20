import React from 'react';
import { useWeatherIcon } from '../hooks/useWeatherIcon';
import WeatherIcon from './WeatherIcon';

export default function StationHeader({ currentStation, playing }) {
  const { weatherCondition, loading } = useWeatherIcon(
    currentStation?.city,
    currentStation?.country
  );

  return (
    <div className="station-header-top">
      <span className="station-header-content">  
        <span className="station-header-text">
          {currentStation ? (
            <>
              {currentStation.name} — {currentStation.city}
              {!loading && weatherCondition && (
                <WeatherIcon weatherCondition={weatherCondition} size={16} />
              )}
            </>
          ) : (
            '\u00A0'
          )}
        </span>
        <span className="station-live-indicator">
          <span className={`wave-indicator ${playing ? 'wave-playing' : ''}`} />
        </span>
      </span>
    </div>
  );
}

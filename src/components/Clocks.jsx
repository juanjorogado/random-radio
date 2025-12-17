import React from 'react';

export default function Clocks({ currentStation, currentTime, getLocalTime }) {
  return (
    <div className="clocks-horizontal">
      <div className="clock-item">
        <div className="clock-label-top">Hora local</div>
        <div className="clock-time-large">
          {currentTime.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
      <div className="clock-item">
        <div className="clock-label-top">
          {currentStation ? currentStation.city : 'Ciudad'}
        </div>
        <div className="clock-time-large">
          {currentStation
            ? getLocalTime(currentStation.timezone)
            : '--:--'}
        </div>
      </div>
    </div>
  );
}


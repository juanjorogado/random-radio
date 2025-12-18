import React from 'react';
import { formatTrackInfo } from '../utils/formatTrackInfo';

/**
 * Componente que muestra la información de la pista actual con efecto marquee
 */
export default function TrackInfo({ track }) {
  const trackInfoText = formatTrackInfo(track);
  const parts = trackInfoText.split(' ◌ ');
  const formattedText = parts.length > 1 ? (
    <>
      {parts[0]}
      {' '}
      <span className="rotating-symbol">◌</span>
      {' '}
      {parts.slice(1).join(' — ')}
    </>
  ) : trackInfoText;

  return (
    <div className="track-info-section">
      <div className="marquee-container">
        <div className="marquee-content">
          <span className="marquee-text song-title">
            {formattedText}
          </span>
          <span
            className="marquee-text song-title"
            aria-hidden="true"
          >
            {formattedText}
          </span>
        </div>
      </div>
    </div>
  );
}

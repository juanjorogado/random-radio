import React from 'react';

/**
 * Indicador visual para mostrar que se puede hacer tap en la portada
 */
export default function TapIndicator({ transitioning }) {
  return (
    <div 
      className={`tap-indicator ${transitioning ? 'tap-to-spinner' : ''}`} 
      aria-label="Tap para reproducir"
    >
      <span className="tap-center-symbol">◌</span>
      <span className="tap-wave-ring tap-wave-ring-1">◌</span>
      <span className="tap-wave-ring tap-wave-ring-2">◌</span>
    </div>
  );
}

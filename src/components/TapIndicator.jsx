import React from 'react';

/**
 * Indicador visual para mostrar que se puede hacer tap en la portada
 * Réplica del wave-indicator pero más grande
 */
export default function TapIndicator({ transitioning }) {
  return (
    <div 
      className={`tap-indicator ${transitioning ? 'tap-to-spinner' : ''}`} 
      aria-label="Tap para reproducir"
    />
  );
}

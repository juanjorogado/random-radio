import React from 'react';

/**
 * Indicador de carga/buffering
 */
export default function BufferingIndicator({ complete }) {
  return (
    <div 
      className={`buffering-indicator ${complete ? 'buffering-complete' : ''}`} 
      aria-label="Cargando"
    >
      <div className="buffering-spinner">
        <div className="wave-spinner"></div>
      </div>
    </div>
  );
}



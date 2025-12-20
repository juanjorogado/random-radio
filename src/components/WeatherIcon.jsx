import React from 'react';

/**
 * Componente que muestra un icono SVG outline según la condición climática
 */
export default function WeatherIcon({ weatherCondition, size = 16 }) {
  if (!weatherCondition || !weatherCondition.main) {
    return null;
  }

  const main = weatherCondition.main.toLowerCase();
  const desc = weatherCondition.description?.toLowerCase() || '';

  // Mapear condiciones climáticas a iconos SVG outline
  let iconSvg = null;

  if (main.includes('clear') || main.includes('sunny')) {
    // Sol
    iconSvg = (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    );
  } else if (main.includes('cloud')) {
    if (desc.includes('few') || desc.includes('scattered')) {
      // Nubes dispersas
      iconSvg = (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        </svg>
      );
    } else {
      // Nubes
      iconSvg = (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        </svg>
      );
    }
  } else if (main.includes('rain') || main.includes('drizzle')) {
    // Lluvia
    iconSvg = (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        <line x1="8" y1="19" x2="8" y2="21"/>
        <line x1="12" y1="19" x2="12" y2="21"/>
        <line x1="16" y1="19" x2="16" y2="21"/>
      </svg>
    );
  } else if (main.includes('storm') || main.includes('thunder')) {
    // Tormenta
    iconSvg = (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        <polyline points="13 11 9 17 15 17 11 23"/>
      </svg>
    );
  } else if (main.includes('snow')) {
    // Nieve
    iconSvg = (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        <line x1="8" y1="19" x2="8.01" y2="19"/>
        <line x1="12" y1="19" x2="12.01" y2="19"/>
        <line x1="16" y1="19" x2="16.01" y2="19"/>
        <line x1="10" y1="17" x2="10.01" y2="17"/>
        <line x1="14" y1="17" x2="14.01" y2="17"/>
      </svg>
    );
  } else if (main.includes('mist') || main.includes('fog') || main.includes('haze')) {
    // Niebla
    iconSvg = (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        <line x1="6" y1="16" x2="18" y2="16"/>
        <line x1="8" y1="18" x2="16" y2="18"/>
      </svg>
    );
  } else {
    // Por defecto: nubes
    iconSvg = (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      </svg>
    );
  }

  return (
    <span className="weather-icon" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.5rem' }}>
      {iconSvg}
    </span>
  );
}


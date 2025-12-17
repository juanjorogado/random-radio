import { useImageStatus } from '../hooks/useImageStatus';
import { useState, useEffect } from 'react';

// Generar gradiente único basado en el ID de la emisora
const generateGradientFromId = (id, name, isDarkMode = false) => {
  if (!id && !name) {
    return isDarkMode ? '#2a2a2a' : '#CBD8BF';
  }
  
  const seed = (id || name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  if (isDarkMode) {
    // En dark mode: usar paleta oscura (variaciones de gris oscuro)
    const darkColors = ['#1a1a1a', '#2a2a2a', '#1f1f1f', '#252525'];
    const color1 = darkColors[seed % darkColors.length];
    const color2 = darkColors[(seed + 1) % darkColors.length];
    return `linear-gradient(135deg, ${color1}, ${color2})`;
  } else {
    // En light mode: usar colores verdes originales
    const colors = ['#CBD8BF', '#E5ECDF'];
    const color1 = colors[seed % 2];
    const color2 = colors[(seed + 1) % 2];
    return `linear-gradient(135deg, ${color1}, ${color2})`;
  }
};

export default function AlbumCover({ src, stationId, stationName }) {
  const status = useImageStatus(src);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const fallbackGradient = generateGradientFromId(stationId, stationName, isDarkMode);

  return (
    <div 
      className="album-cover-main"
      style={!src && fallbackGradient ? { background: fallbackGradient } : {}}
    >
      {status === 'loaded' && (
        <img
          src={src}
          className="album-cover-image"
          alt=""
        />
      )}
    </div>
  );
}
import { useImageStatus } from '../hooks/useImageStatus';
import { useCityImage } from '../hooks/useCityImage';
import { useAlbumCover } from '../hooks/useAlbumCover';
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

export default function AlbumCover({ src, stationId, stationName, city, country, artist, album, stationLogo }) {
  const status = useImageStatus(src);
  // Buscar cover del álbum si no tenemos src pero tenemos artista y álbum
  const shouldSearch = !src && artist && album;
  const { coverUrl: albumCoverUrl } = useAlbumCover(
    shouldSearch ? artist : null,
    shouldSearch ? album : null
  );
  const albumCoverStatus = useImageStatus(albumCoverUrl);
  const stationLogoStatus = useImageStatus(stationLogo);
  const { imageUrl: cityImageUrl } = useCityImage(city, country);
  const cityImageStatus = useImageStatus(cityImageUrl);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);


  const fallbackGradient = generateGradientFromId(stationId, stationName, isDarkMode);
  
  // Prioridad: cover de canción (src) > cover de álbum buscado > logo de estación > imagen de ciudad > gradiente
  const showCoverImage = src && status === 'loaded';
  const showAlbumCover = !showCoverImage && albumCoverUrl && albumCoverStatus === 'loaded';
  const showStationLogo = !showCoverImage && !showAlbumCover && stationLogo && stationLogoStatus === 'loaded';
  const showCityImage = !showCoverImage && !showAlbumCover && !showStationLogo && cityImageUrl && cityImageStatus === 'loaded';

  return (
    <div 
      className="album-cover-main"
      style={!showCoverImage && !showAlbumCover && !showStationLogo && !showCityImage && fallbackGradient ? { background: fallbackGradient } : {}}
    >
      {showCoverImage && (
        <img
          src={src}
          className="album-cover-image"
          alt=""
        />
      )}
      {showAlbumCover && (
        <img
          src={albumCoverUrl}
          className="album-cover-image"
          alt={album ? `Portada de ${album}` : ''}
        />
      )}
      {showStationLogo && (
        <img
          src={stationLogo}
          className="album-cover-image"
          alt={stationName ? `Logo de ${stationName}` : ''}
        />
      )}
      {showCityImage && (
        <img
          src={cityImageUrl}
          className="album-cover-image city-sky-image"
          alt={`Cielo de ${city}`}
        />
      )}
    </div>
  );
}
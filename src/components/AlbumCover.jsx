import { useImageStatus } from '../hooks/useImageStatus';

// Generar gradiente único basado en el ID de la emisora usando solo los 3 colores permitidos
const generateGradientFromId = (id, name) => {
  if (!id && !name) return '#CBD8BF';
  const seed = (id || name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Usar solo los 3 colores: CBD8BF, E5ECDF, 000000
  // Variar la opacidad o mezcla entre CBD8BF y E5ECDF
  const colors = ['#CBD8BF', '#E5ECDF'];
  const color1 = colors[seed % 2];
  const color2 = colors[(seed + 1) % 2];
  
  return `linear-gradient(135deg, ${color1}, ${color2})`;
};

export default function AlbumCover({ src, stationId, stationName }) {
  const status = useImageStatus(src);
  const fallbackGradient = generateGradientFromId(stationId, stationName);

  return (
    <div 
      className="album-cover-main"
      style={!src && fallbackGradient ? { background: fallbackGradient } : {}}
    >
      {status === 'loaded' && (
        <img
          src={src}
          className="album-cover-image fade-in"
          alt=""
        />
      )}
    </div>
  );
}
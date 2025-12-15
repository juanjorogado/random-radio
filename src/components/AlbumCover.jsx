import { useImageStatus } from '../hooks/useImageStatus';

// Generar gradiente único basado en el ID de la emisora
const generateGradientFromId = (id, name) => {
  if (!id && !name) return null;
  const seed = (id || name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Generar colores basados en el seed
  const hue1 = (seed * 137.508) % 360;
  const hue2 = (seed * 73.7) % 360;
  const sat1 = 30 + (seed % 20);
  const sat2 = 25 + (seed % 15);
  const light1 = 45 + (seed % 15);
  const light2 = 55 + (seed % 20);
  
  return `linear-gradient(135deg, hsl(${hue1}, ${sat1}%, ${light1}%), hsl(${hue2}, ${sat2}%, ${light2}%))`;
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
import { useState, useEffect } from 'react';

/**
 * Hook para obtener imagen de cielo/nubes de una ciudad
 * Usa Unsplash API para obtener imágenes relacionadas con la ciudad
 */
export function useCityImage(city, country) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) {
      setImageUrl(null);
      return;
    }

    setLoading(true);
    
    // Usar Unsplash Source API (no requiere API key)
    // Formato: https://source.unsplash.com/featured/?{query}
    const query = encodeURIComponent(`${city} ${country || ''} sky clouds`);
    const unsplashUrl = `https://source.unsplash.com/featured/800x800/?${query}`;
    
    // Verificar que la imagen se carga correctamente
    const img = new Image();
    let timeoutId;
    
    img.onload = () => {
      if (timeoutId) clearTimeout(timeoutId);
      setImageUrl(unsplashUrl);
      setLoading(false);
    };
    
    img.onerror = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // Fallback: usar una imagen genérica de cielo
      setImageUrl(`https://source.unsplash.com/featured/800x800/?sky,clouds`);
      setLoading(false);
    };
    
    // Timeout de 5 segundos para evitar esperas infinitas
    timeoutId = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      setImageUrl(`https://source.unsplash.com/featured/800x800/?sky,clouds`);
      setLoading(false);
    }, 5000);
    
    img.src = unsplashUrl;
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
  }, [city, country]);

  return { imageUrl, loading };
}


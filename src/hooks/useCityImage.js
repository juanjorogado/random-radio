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
    let isCancelled = false;
    
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      img.onload = null;
      img.onerror = null;
    };
    
    img.onload = () => {
      if (isCancelled) return;
      cleanup();
      setImageUrl(unsplashUrl);
      setLoading(false);
    };
    
    img.onerror = () => {
      if (isCancelled) return;
      cleanup();
      // Fallback: usar una imagen genérica de cielo
      const fallbackUrl = `https://source.unsplash.com/featured/800x800/?sky,clouds`;
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        if (!isCancelled) {
          setImageUrl(fallbackUrl);
          setLoading(false);
        }
      };
      fallbackImg.onerror = () => {
        if (!isCancelled) {
          setImageUrl(null);
          setLoading(false);
        }
      };
      fallbackImg.src = fallbackUrl;
    };
    
    // Timeout de 10 segundos para evitar esperas infinitas
    timeoutId = setTimeout(() => {
      if (!isCancelled) {
        cleanup();
        // Intentar fallback genérico
        const fallbackUrl = `https://source.unsplash.com/featured/800x800/?sky,clouds`;
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          if (!isCancelled) {
            setImageUrl(fallbackUrl);
            setLoading(false);
          }
        };
        fallbackImg.onerror = () => {
          if (!isCancelled) {
            setImageUrl(null);
            setLoading(false);
          }
        };
        fallbackImg.src = fallbackUrl;
      }
    }, 10000);
    
    img.src = unsplashUrl;
    
    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
  }, [city, country]);

  return { imageUrl, loading };
}


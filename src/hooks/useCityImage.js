import { useState, useEffect } from 'react';

/**
 * Hook para obtener imagen de cielo/nubes de una ciudad
 * Usa Unsplash API para obtener imágenes relacionadas con la ciudad
 * 
 * Para obtener tu API key gratuita:
 * 1. Ve a https://unsplash.com/developers
 * 2. Crea una cuenta o inicia sesión
 * 3. Crea una nueva aplicación
 * 4. Copia tu Access Key
 * 5. Agrega la variable de entorno REACT_APP_UNSPLASH_ACCESS_KEY o reemplaza el valor abajo
 */
const UNSPLASH_ACCESS_KEY = process.env.REACT_APP_UNSPLASH_ACCESS_KEY || 'UhX4ggisEbYRtA0tDbwZTAl_bLfVb3KGNflEGTsZtKE';

export function useCityImage(city, country) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) {
      setImageUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Construir query de búsqueda para Unsplash
    const query = encodeURIComponent(`${city} ${country || ''} sky clouds cityscape`);
    const unsplashUrl = `https://api.unsplash.com/photos/random?query=${query}&orientation=square&client_id=${UNSPLASH_ACCESS_KEY}`;
    
    let isCancelled = false;
    let timeoutId;
    let hasSetImage = false;
    
    // Función para usar fallback con Picsum Photos
    const loadPicsumFallback = () => {
      if (hasSetImage || isCancelled) return;
      const seed = (city + (country || '')).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const fallbackUrl = `https://picsum.photos/seed/${seed}/800/800`;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!isCancelled && !hasSetImage) {
          hasSetImage = true;
          setImageUrl(fallbackUrl);
          setLoading(false);
        }
      };
      img.onerror = () => {
        if (!isCancelled && !hasSetImage) {
          hasSetImage = true;
          setImageUrl(null);
          setLoading(false);
        }
      };
      img.src = fallbackUrl;
    };
    
    // Intentar obtener imagen de Unsplash
    fetch(unsplashUrl, {
      headers: {
        'Accept-Version': 'v1'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Unsplash API error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (isCancelled || hasSetImage) return;
        
        // Unsplash devuelve la imagen en data.urls.regular o data.urls.small
        const url = data.urls?.regular || data.urls?.small || null;
        
        if (url) {
          // Verificar que la imagen se carga correctamente
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            if (!isCancelled && !hasSetImage) {
              hasSetImage = true;
              setImageUrl(url);
              setLoading(false);
            }
          };
          img.onerror = () => {
            if (!isCancelled && !hasSetImage) {
              // Si la URL de Unsplash no carga, usar fallback
              loadPicsumFallback();
            }
          };
          img.src = url;
        } else {
          loadPicsumFallback();
        }
      })
      .catch(() => {
        if (!isCancelled && !hasSetImage) {
          // Si falla Unsplash, usar fallback
          loadPicsumFallback();
        }
      });
    
    // Timeout de 10 segundos
    timeoutId = setTimeout(() => {
      if (!isCancelled && !hasSetImage) {
        loadPicsumFallback();
      }
    }, 10000);
    
    return () => {
      isCancelled = true;
      hasSetImage = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [city, country]);

  return { imageUrl, loading };
}


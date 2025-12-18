import { useState, useEffect } from 'react';

/**
 * Hook para obtener imagen de cielo/nubes de una ciudad
 * Usa Pexels API para obtener imágenes relacionadas con la ciudad
 * 
 * Para obtener tu API key gratuita:
 * 1. Ve a https://www.pexels.com/api/
 * 2. Crea una cuenta o inicia sesión
 * 3. Copia tu API key
 * 4. Agrega la variable de entorno REACT_APP_PEXELS_API_KEY o reemplaza el valor abajo
 */
const PEXELS_API_KEY = process.env.REACT_APP_PEXELS_API_KEY || 'wumPREtlaF7jz2tJ03NoIPtaJiyxsTMDU2LC9h4zQyVVrP4QhN6eQYzu';

const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

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
    
    // Limpiar ciudad y país
    const cleanCity = city.trim();
    const cleanCountry = country ? country.trim() : '';
    
    // Construir queries de búsqueda para Pexels - enfocado en cielo y nubes
    const queries = cleanCountry
      ? [
          `${cleanCity} ${cleanCountry} sky clouds`,
          `${cleanCity} ${cleanCountry} sky`,
          `${cleanCity} sky clouds`,
          `${cleanCity} clouds`,
          `sky clouds ${cleanCity}`
        ]
      : [
          `${cleanCity} sky clouds`,
          `${cleanCity} sky`,
          `${cleanCity} clouds`,
          `sky clouds ${cleanCity}`
        ];
    
    let isCancelled = false;
    let timeoutId;
    let hasSetImage = false;
    let queryIndex = 0;
    
    // Función para usar fallback con Picsum Photos
    const loadGenericFallback = () => {
      if (hasSetImage || isCancelled) return;
      const seed = (cleanCity + cleanCountry).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
    
    // Función para intentar búsquedas alternativas en Pexels
    const tryNextQuery = () => {
      if (isCancelled || hasSetImage) return;
      
      if (queryIndex >= queries.length - 1) {
        loadGenericFallback();
        return;
      }
      
      queryIndex++;
      const currentQuery = queries[queryIndex].trim();
      const encodedQuery = encodeURIComponent(currentQuery);
      const nextUrl = `${PEXELS_BASE_URL}/search?query=${encodedQuery}&orientation=square&per_page=1&size=large`;
      
      fetch(nextUrl, {
        headers: {
          'Authorization': PEXELS_API_KEY
        }
      })
        .then(response => {
          if (!response.ok) {
            if (queryIndex < queries.length - 1) {
              tryNextQuery();
              return null;
            }
            loadGenericFallback();
            return null;
          }
          return response.json();
        })
        .then(data => {
          if (!data || isCancelled || hasSetImage) return;
          
          // Pexels devuelve photos[0].src.large o photos[0].src.medium
          const photo = data.photos?.[0];
          const url = photo?.src?.large || photo?.src?.medium || null;
          
          if (url) {
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
              tryNextQuery();
            };
            img.src = url;
          } else {
            tryNextQuery();
          }
        })
        .catch(() => {
          tryNextQuery();
        });
    };
    
    // Intentar obtener imagen de Pexels con la primera query
    const firstQuery = queries[0].trim();
    const encodedQuery = encodeURIComponent(firstQuery);
    const pexelsUrl = `${PEXELS_BASE_URL}/search?query=${encodedQuery}&orientation=square&per_page=1&size=large`;
    
    fetch(pexelsUrl, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    })
      .then(response => {
        if (!response.ok) {
          if (queryIndex < queries.length - 1) {
            tryNextQuery();
          } else {
            loadGenericFallback();
          }
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (!data || isCancelled || hasSetImage) return;
        
        // Pexels devuelve photos[0].src.large o photos[0].src.medium
        const photo = data.photos?.[0];
        const url = photo?.src?.large || photo?.src?.medium || null;
        
        if (url) {
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
              tryNextQuery();
            }
          };
          img.src = url;
        } else {
          tryNextQuery();
        }
      })
      .catch(() => {
        if (!isCancelled && !hasSetImage) {
          tryNextQuery();
        }
      });
    
    // Timeout de 8 segundos
    timeoutId = setTimeout(() => {
      if (!isCancelled && !hasSetImage) {
        if (queryIndex < queries.length - 1) {
          tryNextQuery();
        } else {
          loadGenericFallback();
        }
      }
    }, 8000);
    
    return () => {
      isCancelled = true;
      hasSetImage = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [city, country]);

  return { imageUrl, loading };
}
import { useState, useEffect } from 'react';

/**
 * Hook para obtener imagen de cielo/nubes basada en el clima actual de la ciudad
 * Usa OpenWeatherMap para obtener el clima y luego busca imágenes apropiadas
 */
const PEXELS_API_KEY = process.env.REACT_APP_PEXELS_API_KEY || 'wumPREtlaF7jz2tJ03NoIPtaJiyxsTMDU2LC9h4zQyVVrP4QhN6eQYzu';
const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '';

const PEXELS_BASE_URL = 'https://api.pexels.com/v1';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Mapea condiciones climáticas a términos de búsqueda para imágenes
 */
function getWeatherSearchTerms(weatherMain, weatherDescription) {
  const main = weatherMain?.toLowerCase() || '';
  const desc = weatherDescription?.toLowerCase() || '';
  
  // Mapeo de condiciones climáticas a términos de búsqueda
  if (main.includes('clear') || main.includes('sunny')) {
    return ['clear sky', 'sunny sky', 'blue sky', 'bright sky'];
  }
  if (main.includes('cloud')) {
    if (desc.includes('few') || desc.includes('scattered')) {
      return ['partly cloudy sky', 'clouds sky', 'scattered clouds'];
    }
    if (desc.includes('broken') || desc.includes('overcast')) {
      return ['cloudy sky', 'overcast sky', 'grey sky', 'clouds'];
    }
    return ['cloudy sky', 'clouds', 'sky clouds'];
  }
  if (main.includes('rain') || main.includes('drizzle')) {
    return ['rainy sky', 'cloudy sky rain', 'storm clouds', 'dark clouds'];
  }
  if (main.includes('storm') || main.includes('thunder')) {
    return ['storm clouds', 'dark sky', 'thunderstorm sky', 'dramatic clouds'];
  }
  if (main.includes('snow')) {
    return ['snowy sky', 'winter sky', 'cloudy sky snow'];
  }
  if (main.includes('mist') || main.includes('fog') || main.includes('haze')) {
    return ['misty sky', 'foggy sky', 'hazy sky', 'atmospheric sky'];
  }
  
  // Por defecto: cielo con nubes
  return ['sky clouds', 'cloudy sky', 'sky'];
}

export function useWeatherSkyImage(city, country) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) {
      setImageUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const cleanCity = city.trim();
    const cleanCountry = country ? country.trim() : '';
    
    let isCancelled = false;
    let timeoutId;
    let hasSetImage = false;
    
    // Función para buscar imagen en Pexels basada en términos de búsqueda
    const searchPexelsImage = (searchTerms) => {
      if (isCancelled || hasSetImage) return;
      
      const query = searchTerms[0];
      const encodedQuery = encodeURIComponent(query);
      const pexelsUrl = `${PEXELS_BASE_URL}/search?query=${encodedQuery}&orientation=square&per_page=1&size=large`;
      
      fetch(pexelsUrl, {
        headers: {
          'Authorization': PEXELS_API_KEY
        }
      })
        .then(response => {
          if (!response.ok) {
            // Si falla, intentar con términos genéricos
            if (searchTerms.length > 1) {
              searchPexelsImage(searchTerms.slice(1));
            } else {
              loadGenericFallback();
            }
            return null;
          }
          return response.json();
        })
        .then(data => {
          if (!data || isCancelled || hasSetImage) return;
          
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
              if (searchTerms.length > 1) {
                searchPexelsImage(searchTerms.slice(1));
              } else {
                loadGenericFallback();
              }
            };
            img.src = url;
          } else {
            if (searchTerms.length > 1) {
              searchPexelsImage(searchTerms.slice(1));
            } else {
              loadGenericFallback();
            }
          }
        })
        .catch(() => {
          if (searchTerms.length > 1) {
            searchPexelsImage(searchTerms.slice(1));
          } else {
            loadGenericFallback();
          }
        });
    };
    
    // Función fallback: usar Pollinations.ai para generar imagen de cielo y nubes
    const loadGenericFallback = () => {
      if (hasSetImage || isCancelled) return;
      
      // Generar prompt para Pollinations.ai basado en la ciudad
      const prompt = `beautiful sky with clouds, ${cleanCity} ${cleanCountry ? cleanCountry : ''}, cinematic, photorealistic, 1:1 aspect ratio`.trim();
      const encodedPrompt = encodeURIComponent(prompt);
      
      // Pollinations.ai URL format
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&model=flux&nologo=true`;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        if (!isCancelled && !hasSetImage) {
          hasSetImage = true;
          setImageUrl(pollinationsUrl);
          setLoading(false);
        }
      };
      
      img.onerror = () => {
        // Si falla, intentar con un prompt más simple
        const simplePrompt = encodeURIComponent('beautiful sky with clouds, cinematic, photorealistic, 1:1 aspect ratio');
        const simpleUrl = `https://image.pollinations.ai/prompt/${simplePrompt}?width=800&height=800&model=flux&nologo=true`;
        
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => {
          if (!isCancelled && !hasSetImage) {
            hasSetImage = true;
            setImageUrl(simpleUrl);
            setLoading(false);
          }
        };
        fallbackImg.onerror = () => {
          if (!isCancelled && !hasSetImage) {
            hasSetImage = true;
            setImageUrl(null);
            setLoading(false);
          }
        };
        fallbackImg.src = simpleUrl;
      };
      
      img.src = pollinationsUrl;
    };
    
    // Si no hay API key de OpenWeatherMap, usar búsqueda genérica
    if (!OPENWEATHER_API_KEY) {
      const genericTerms = ['sky clouds', 'cloudy sky', 'sky'];
      searchPexelsImage(genericTerms);
      
      timeoutId = setTimeout(() => {
        if (!isCancelled && !hasSetImage) {
          loadGenericFallback();
        }
      }, 8000);
      
      return () => {
        isCancelled = true;
        hasSetImage = true;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
    
    // Obtener clima de la ciudad
    const cityQuery = cleanCountry ? `${cleanCity},${cleanCountry}` : cleanCity;
    const weatherUrl = `${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(cityQuery)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`;
    
    fetch(weatherUrl)
      .then(response => {
        if (!response.ok) {
          // Si falla la API de clima, usar búsqueda genérica
          const genericTerms = ['sky clouds', 'cloudy sky', 'sky'];
          searchPexelsImage(genericTerms);
          return null;
        }
        return response.json();
      })
      .then(weatherData => {
        if (!weatherData || isCancelled || hasSetImage) return;
        
        const weatherMain = weatherData.weather?.[0]?.main;
        const weatherDescription = weatherData.weather?.[0]?.description;
        
        // Obtener términos de búsqueda basados en el clima
        const searchTerms = getWeatherSearchTerms(weatherMain, weatherDescription);
        
        // Buscar imagen en Pexels
        searchPexelsImage(searchTerms);
      })
      .catch(() => {
        // Si falla, usar búsqueda genérica
        if (!isCancelled && !hasSetImage) {
          const genericTerms = ['sky clouds', 'cloudy sky', 'sky'];
          searchPexelsImage(genericTerms);
        }
      });
    
    // Timeout de 10 segundos
    timeoutId = setTimeout(() => {
      if (!isCancelled && !hasSetImage) {
        loadGenericFallback();
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


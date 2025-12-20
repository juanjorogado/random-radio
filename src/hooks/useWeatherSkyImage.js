import { useState, useEffect } from 'react';

/**
 * Hook para obtener imagen de cielo/nubes basada en el clima actual de la ciudad
 * Usa Pollinations.ai para generar imágenes de cielo y nubes
 */
const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Mapea condiciones climáticas a prompts para Pollinations.ai
 */
function getWeatherPrompt(weatherMain, weatherDescription, city, country) {
  const main = weatherMain?.toLowerCase() || '';
  const desc = weatherDescription?.toLowerCase() || '';
  const location = city ? `${city}${country ? `, ${country}` : ''}` : '';
  
  let weatherDesc = '';
  
  if (main.includes('clear') || main.includes('sunny')) {
    weatherDesc = 'clear blue sky with white fluffy clouds';
  } else if (main.includes('cloud')) {
    if (desc.includes('few') || desc.includes('scattered')) {
      weatherDesc = 'partly cloudy sky with scattered white clouds';
    } else if (desc.includes('broken') || desc.includes('overcast')) {
      weatherDesc = 'overcast cloudy sky with grey clouds';
    } else {
      weatherDesc = 'cloudy sky with clouds';
    }
  } else if (main.includes('rain') || main.includes('drizzle')) {
    weatherDesc = 'rainy cloudy sky with dark storm clouds';
  } else if (main.includes('storm') || main.includes('thunder')) {
    weatherDesc = 'dramatic stormy sky with dark thunderstorm clouds';
  } else if (main.includes('snow')) {
    weatherDesc = 'winter snowy sky with clouds';
  } else if (main.includes('mist') || main.includes('fog') || main.includes('haze')) {
    weatherDesc = 'misty foggy atmospheric sky';
  } else {
    weatherDesc = 'beautiful sky with clouds';
  }
  
  return `${weatherDesc}${location ? `, ${location}` : ''}, cinematic, photorealistic, 1:1 aspect ratio`;
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
    
    // Función para generar imagen con Pollinations.ai
    const generatePollinationsImage = (prompt) => {
      if (isCancelled || hasSetImage) return;
      
      const encodedPrompt = encodeURIComponent(prompt);
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
        const simplePrompt = 'beautiful sky with clouds, cinematic, photorealistic, 1:1 aspect ratio';
        const simpleEncoded = encodeURIComponent(simplePrompt);
        const simpleUrl = `https://image.pollinations.ai/prompt/${simpleEncoded}?width=800&height=800&model=flux&nologo=true`;
        
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
    
    // Función fallback: usar Pollinations.ai para generar imagen de cielo y nubes
    const loadGenericFallback = () => {
      if (hasSetImage || isCancelled) return;
      
      // Generar prompt para Pollinations.ai basado en la ciudad
      const prompt = `beautiful sky with clouds${cleanCity ? `, ${cleanCity}` : ''}${cleanCountry ? `, ${cleanCountry}` : ''}, cinematic, photorealistic, 1:1 aspect ratio`;
      generatePollinationsImage(prompt);
    };
    
    // Si no hay API key de OpenWeatherMap, usar fallback genérico
    if (!OPENWEATHER_API_KEY) {
      loadGenericFallback();
      
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
          // Si falla la API de clima, usar fallback genérico
          loadGenericFallback();
          return null;
        }
        return response.json();
      })
      .then(weatherData => {
        if (!weatherData || isCancelled || hasSetImage) return;
        
        const weatherMain = weatherData.weather?.[0]?.main;
        const weatherDescription = weatherData.weather?.[0]?.description;
        
        // Obtener prompt basado en el clima
        const prompt = getWeatherPrompt(weatherMain, weatherDescription, cleanCity, cleanCountry);
        
        // Generar imagen con Pollinations.ai
        generatePollinationsImage(prompt);
      })
      .catch(() => {
        // Si falla, usar fallback genérico
        if (!isCancelled && !hasSetImage) {
          loadGenericFallback();
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


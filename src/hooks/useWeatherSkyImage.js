import { useState, useEffect } from 'react';

/**
 * Hook para obtener imagen de cielo/nubes basada en el clima actual de la ciudad
 * Usa Nano Banana para generar imágenes de cielo y nubes
 */
const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Mapea condiciones climáticas a prompts para Nano Banana
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
    
    // Función para generar imagen con Nano Banana
    const generateNanoBananaImage = (prompt) => {
      if (isCancelled || hasSetImage) return;
      
      const encodedPrompt = encodeURIComponent(prompt);
      // Nano Banana API - formato de URL para generación de imágenes
      const nanoBananaUrl = `https://api.nanobanana.ai/generate?prompt=${encodedPrompt}&width=800&height=800&aspect_ratio=1:1`;
      
      // Establecer la URL directamente
      // Nano Banana genera la imagen on-demand
      if (!isCancelled && !hasSetImage) {
        hasSetImage = true;
        setImageUrl(nanoBananaUrl);
        setLoading(false);
      }
    };
    
    // Función fallback: usar Nano Banana para generar imagen de cielo y nubes
    const loadGenericFallback = () => {
      if (hasSetImage || isCancelled) return;
      
      // Generar prompt para Nano Banana basado en la ciudad
      const prompt = `beautiful sky with clouds${cleanCity ? `, ${cleanCity}` : ''}${cleanCountry ? `, ${cleanCountry}` : ''}, cinematic, photorealistic, 1:1 aspect ratio`;
      generateNanoBananaImage(prompt);
    };
    
    // Si no hay API key de OpenWeatherMap, usar fallback genérico inmediatamente
    if (!OPENWEATHER_API_KEY) {
      loadGenericFallback();
      
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
        
        // Generar imagen con Nano Banana
        generateNanoBananaImage(prompt);
      })
      .catch(() => {
        // Si falla, usar fallback genérico
        if (!isCancelled && !hasSetImage) {
          loadGenericFallback();
        }
      });
    
    // Timeout de 5 segundos - si no hay respuesta del clima, usar fallback
    timeoutId = setTimeout(() => {
      if (!isCancelled && !hasSetImage) {
        loadGenericFallback();
      }
    }, 5000);
    
    return () => {
      isCancelled = true;
      hasSetImage = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [city, country]);

  return { imageUrl, loading };
}


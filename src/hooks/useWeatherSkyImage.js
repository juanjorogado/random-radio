import { useState, useEffect } from 'react';

/**
 * Hook para obtener imagen de cielo/nubes basada en el clima actual de la ciudad
 * Usa Gemini API con Nano Banana para generar imágenes de cielo y nubes
 */
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyD1nXG0h60NJiJhtgxiZhFbDZyN7mTDLyM';
const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

/**
 * Mapea condiciones climáticas a prompts para generación de imágenes
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
    
    // Función para generar imagen con Gemini API (Nano Banana)
    const generateImage = (prompt) => {
      if (isCancelled || hasSetImage) return;
      
      // Llamar a la API de Gemini para generar imagen con Nano Banana
      fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a photorealistic image: ${prompt}. The image must be square (1:1 aspect ratio), 800x800 pixels, showing only sky and clouds, no ground, no buildings, no other elements.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (isCancelled || hasSetImage) return;
          
          // Gemini API devuelve la imagen en base64
          const candidate = data.candidates?.[0];
          const part = candidate?.content?.parts?.[0];
          
          if (part?.inlineData?.data) {
            // Imagen en base64
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${imageData}`;
            
            if (!isCancelled && !hasSetImage) {
              hasSetImage = true;
              setImageUrl(imageUrl);
              setLoading(false);
            }
          } else {
            // Si no hay imagen, usar fallback
            loadGenericFallback();
          }
        })
        .catch(() => {
          // Si falla, usar fallback
          if (!isCancelled && !hasSetImage) {
            loadGenericFallback();
          }
        });
    };
    
    // Función fallback: generar imagen de cielo y nubes
    const loadGenericFallback = () => {
      if (hasSetImage || isCancelled) return;
      
      // Generar prompt basado en la ciudad
      const prompt = `beautiful sky with clouds${cleanCity ? `, ${cleanCity}` : ''}${cleanCountry ? `, ${cleanCountry}` : ''}, cinematic, photorealistic, 1:1 aspect ratio`;
      generateImage(prompt);
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
        
        // Generar imagen
        generateImage(prompt);
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


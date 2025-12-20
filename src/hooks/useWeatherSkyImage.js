import { useState, useEffect, useRef } from 'react';

/**
 * Hook para obtener imagen de cielo/nubes basada en el clima actual de la ciudad
 * Usa Gemini API con Nano Banana para generar imágenes de cielo y nubes
 */
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyD1nXG0h60NJiJhtgxiZhFbDZyN7mTDLyM';
const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
// Usar el modelo correcto para generación de imágenes: gemini-2.5-flash-image
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
// Fallback: Pollinations.ai (gratuito, sin API key)
const POLLINATIONS_API_URL = 'https://image.pollinations.ai/prompt';

// Caché en memoria para evitar llamadas repetidas
const imageCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Caché de clima para evitar llamadas repetidas a OpenWeatherMap
const weatherCache = new Map();
const WEATHER_CACHE_DURATION = 60 * 60 * 1000; // 1 hora

// Control de rate limiting - deshabilitar Gemini si hay demasiados errores
let geminiRateLimitCount = 0;
let geminiDisabledUntil = 0;
const RATE_LIMIT_THRESHOLD = 3; // Deshabilitar después de 3 errores 429
const RATE_LIMIT_DISABLE_DURATION = 60 * 60 * 1000; // Deshabilitar por 1 hora

/**
 * Determina la hora del día basándose en la hora actual y los tiempos de salida/puesta del sol
 */
function getTimeOfDay(currentTime, sunrise, sunset) {
  const hour = new Date(currentTime * 1000).getHours();
  const sunriseHour = new Date(sunrise * 1000).getHours();
  const sunsetHour = new Date(sunset * 1000).getHours();
  
  if (hour >= sunriseHour && hour < sunriseHour + 2) {
    return 'sunrise';
  } else if (hour >= sunriseHour + 2 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < sunsetHour - 2) {
    return 'afternoon';
  } else if (hour >= sunsetHour - 2 && hour < sunsetHour) {
    return 'sunset';
  } else if (hour >= sunsetHour || hour < sunriseHour) {
    return 'night';
  }
  return 'day';
}

/**
 * Genera un prompt detallado basado en datos específicos del clima
 */
function generateDetailedPrompt(weatherData, city, country) {
  const weatherMain = weatherData.weather?.[0]?.main || '';
  const weatherDescription = weatherData.weather?.[0]?.description || '';
  const cloudsPercent = weatherData.clouds?.all || 0;
  const currentTime = weatherData.dt || Date.now() / 1000;
  const sunrise = weatherData.sys?.sunrise || 0;
  const sunset = weatherData.sys?.sunset || 0;
  
  const location = city ? `${city}${country ? `, ${country}` : ''}` : '';
  const timeOfDay = getTimeOfDay(currentTime, sunrise, sunset);
  
  // Mapear condiciones climáticas
  let weatherCondition = '';
  const main = weatherMain.toLowerCase();
  
  if (main.includes('clear') || main.includes('sunny')) {
    weatherCondition = 'clear';
  } else if (main.includes('cloud')) {
    weatherCondition = 'cloudy';
  } else if (main.includes('rain') || main.includes('drizzle')) {
    weatherCondition = 'rainy';
  } else if (main.includes('storm') || main.includes('thunder')) {
    weatherCondition = 'stormy';
  } else if (main.includes('snow')) {
    weatherCondition = 'snowy';
  } else if (main.includes('mist') || main.includes('fog') || main.includes('haze')) {
    weatherCondition = 'misty';
  } else {
    weatherCondition = 'atmospheric';
  }
  
  // Construir el prompt detallado
  const prompt = `A photorealistic wide shot of a sky in ${location || 'the sky'} at ${timeOfDay}, ${cloudsPercent}% cloud coverage, ${weatherCondition} atmosphere, cinematic lighting, 8k resolution, showing only sky and clouds, no ground, no buildings, no other elements, square 1:1 aspect ratio`;
  
  return prompt;
}

export function useWeatherSkyImage(city, country) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceTimeoutRef = useRef(null);
  const requestInProgressRef = useRef(false);

  useEffect(() => {
    if (!city) {
      setImageUrl(null);
      setLoading(false);
      return;
    }

    const cleanCity = city.trim();
    const cleanCountry = country ? country.trim() : '';
    const cacheKey = `${cleanCity}-${cleanCountry}`;
    
    // Limpiar debounce anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Verificar caché primero
    const cached = imageCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      setImageUrl(cached.imageUrl);
      setLoading(false);
      return;
    }
    
    // Debounce: esperar 500ms antes de hacer la llamada
    debounceTimeoutRef.current = setTimeout(() => {
      // Verificar caché nuevamente después del debounce
      const cachedAfterDebounce = imageCache.get(cacheKey);
      if (cachedAfterDebounce && (Date.now() - cachedAfterDebounce.timestamp) < CACHE_DURATION) {
        setImageUrl(cachedAfterDebounce.imageUrl);
        setLoading(false);
        return;
      }
      
      // Si ya hay una petición en curso, no hacer otra
      if (requestInProgressRef.current) {
        return;
      }
      
      setLoading(true);
      requestInProgressRef.current = true;
      
      let isCancelled = false;
      let timeoutId;
      let hasSetImage = false;
    
    // Función para generar imagen con Pollinations.ai (fallback)
    const generateImageWithPollinations = (prompt) => {
      if (isCancelled || hasSetImage) return;
      
      // Pollinations.ai genera imágenes directamente desde URL
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `${POLLINATIONS_API_URL}/${encodedPrompt}?width=800&height=800&nologo=true`;
      
      // Verificar que la imagen se carga correctamente
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        if (!isCancelled && !hasSetImage) {
          hasSetImage = true;
          // Guardar en caché
          imageCache.set(cacheKey, {
            imageUrl,
            timestamp: Date.now(),
            source: 'pollinations'
          });
          setImageUrl(imageUrl);
          setLoading(false);
          requestInProgressRef.current = false;
        }
      };
      
      img.onerror = () => {
        if (!isCancelled && !hasSetImage) {
          console.warn('Pollinations.ai fallback failed');
          requestInProgressRef.current = false;
          setLoading(false);
        }
      };
      
      img.src = imageUrl;
    };
    
    // Función para generar imagen con Gemini API (Nano Banana)
    const generateImage = (prompt) => {
      if (isCancelled || hasSetImage) return;
      
      // Verificar si Gemini está deshabilitado por rate limiting
      if (Date.now() < geminiDisabledUntil) {
        console.warn('Gemini API disabled due to rate limiting, using Pollinations.ai fallback');
        generateImageWithPollinations(prompt);
        return;
      }
      
      // Llamar a la API de Gemini para generar imagen con Nano Banana
      fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
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
        .then(async response => {
          if (!response.ok) {
            // Intentar obtener el mensaje de error del body
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.error?.message || errorData.message || errorMessage;
              console.error('Gemini API error:', errorData);
            } catch (e) {
              // Si no se puede parsear el error, usar el mensaje por defecto
            }
            
            // Si es error 429, incrementar contador y deshabilitar si es necesario
            if (response.status === 429) {
              geminiRateLimitCount++;
              if (geminiRateLimitCount >= RATE_LIMIT_THRESHOLD) {
                geminiDisabledUntil = Date.now() + RATE_LIMIT_DISABLE_DURATION;
                console.warn('Gemini API rate limit exceeded, disabling for 1 hour');
              }
            }
            throw new Error(errorMessage);
          }
          // Si la respuesta es exitosa, resetear el contador
          geminiRateLimitCount = 0;
          return response.json();
        })
        .then(data => {
          if (isCancelled || hasSetImage) return;
          
          // Gemini API puede devolver la imagen de diferentes formas
          let imageData = null;
          let mimeType = 'image/jpeg';
          
          // Intentar obtener la imagen del responseSchema (estructura JSON)
          if (data.image) {
            imageData = data.image;
          } 
          // Intentar obtener de candidates (estructura inlineData)
          else {
            const candidate = data.candidates?.[0];
            const part = candidate?.content?.parts?.[0];
            
            if (part?.inlineData?.data) {
              imageData = part.inlineData.data;
              mimeType = part.inlineData.mimeType || 'image/jpeg';
            } else if (part?.text) {
              // Si viene como texto base64
              try {
                const parsed = JSON.parse(part.text);
                if (parsed.image) {
                  imageData = parsed.image;
                }
              } catch (e) {
                // Si no es JSON, puede ser base64 directo
                imageData = part.text;
              }
            }
          }
          
          if (imageData) {
            const imageUrl = `data:${mimeType};base64,${imageData}`;
            
            if (!isCancelled && !hasSetImage) {
              hasSetImage = true;
              // Guardar en caché
              imageCache.set(cacheKey, {
                imageUrl,
                timestamp: Date.now()
              });
              setImageUrl(imageUrl);
              setLoading(false);
              requestInProgressRef.current = false;
            }
          } else {
            // Si no hay imagen, usar fallback
            console.warn('No image data received from Gemini API:', data);
            requestInProgressRef.current = false;
            loadGenericFallback();
          }
        })
        .catch((error) => {
          // Si falla (incluyendo 429 rate limit), usar Pollinations.ai como fallback
          requestInProgressRef.current = false;
          if (!isCancelled && !hasSetImage) {
            // Si es error 429 o cualquier error, usar Pollinations.ai
            if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
              console.warn('Gemini API quota exceeded, using Pollinations.ai fallback');
              geminiRateLimitCount++;
              if (geminiRateLimitCount >= RATE_LIMIT_THRESHOLD) {
                geminiDisabledUntil = Date.now() + RATE_LIMIT_DISABLE_DURATION;
                console.warn('Gemini API disabled for 1 hour, will use Pollinations.ai');
              }
            } else {
              console.warn('Gemini API error, using Pollinations.ai fallback:', error.message);
            }
            // Usar Pollinations.ai como fallback
            generateImageWithPollinations(prompt);
          }
        });
    };
    
    // Función fallback: NO generar imagen si Gemini está deshabilitado
    const loadGenericFallback = () => {
      if (hasSetImage || isCancelled) return;
      
      // Si Gemini está deshabilitado, no intentar generar imagen
      if (Date.now() < geminiDisabledUntil) {
        requestInProgressRef.current = false;
        setLoading(false);
        return;
      }
      
      // Generar prompt genérico basado en la ciudad
      const location = cleanCity ? `${cleanCity}${cleanCountry ? `, ${cleanCountry}` : ''}` : '';
      const prompt = `A photorealistic wide shot of a sky in ${location || 'the sky'} at day, 50% cloud coverage, beautiful atmosphere, cinematic lighting, 8k resolution, showing only sky and clouds, no ground, no buildings, no other elements, square 1:1 aspect ratio`;
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
    
      // Obtener clima de la ciudad (con caché)
      const weatherCacheKey = `weather-${cacheKey}`;
      const cachedWeather = weatherCache.get(weatherCacheKey);
      
      if (cachedWeather && (Date.now() - cachedWeather.timestamp) < WEATHER_CACHE_DURATION) {
        // Usar clima en caché
        const prompt = generateDetailedPrompt(cachedWeather.weatherData, cleanCity, cleanCountry);
        generateImage(prompt);
      } else {
        // Obtener clima de la API
        const cityQuery = cleanCountry ? `${cleanCity},${cleanCountry}` : cleanCity;
        const weatherUrl = `${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(cityQuery)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`;
        
        fetch(weatherUrl)
          .then(response => {
            if (!response.ok) {
              // Si falla la API de clima, usar fallback genérico
              requestInProgressRef.current = false;
              loadGenericFallback();
              return null;
            }
            return response.json();
          })
          .then(weatherData => {
            if (!weatherData || isCancelled || hasSetImage) {
              requestInProgressRef.current = false;
              return;
            }
            
            // Guardar clima completo en caché
            weatherCache.set(weatherCacheKey, {
              weatherData,
              timestamp: Date.now()
            });
            
            // Generar prompt detallado con todos los datos del clima
            const prompt = generateDetailedPrompt(weatherData, cleanCity, cleanCountry);
            
            // Generar imagen con el prompt detallado
            generateImage(prompt);
          })
          .catch(() => {
            // Si falla, usar fallback genérico
            requestInProgressRef.current = false;
            if (!isCancelled && !hasSetImage) {
              loadGenericFallback();
            }
          });
      }
    
      // Timeout de 10 segundos - si no hay respuesta, usar fallback
      timeoutId = setTimeout(() => {
        if (!isCancelled && !hasSetImage) {
          requestInProgressRef.current = false;
          loadGenericFallback();
        }
      }, 10000);
      
      return () => {
        isCancelled = true;
        hasSetImage = true;
        requestInProgressRef.current = false;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, 500); // Debounce de 500ms
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [city, country]);

  return { imageUrl, loading };
}


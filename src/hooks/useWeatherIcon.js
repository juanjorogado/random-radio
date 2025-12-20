import { useState, useEffect } from 'react';

const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Caché de clima para evitar llamadas repetidas
const weatherCache = new Map();
const WEATHER_CACHE_DURATION = 60 * 60 * 1000; // 1 hora

/**
 * Hook para obtener la condición climática de una ciudad (solo para icono)
 */
export function useWeatherIcon(city, country) {
  const [weatherCondition, setWeatherCondition] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city || !OPENWEATHER_API_KEY) {
      setWeatherCondition(null);
      setLoading(false);
      return;
    }

    const cleanCity = city.trim();
    const cleanCountry = country ? country.trim() : '';
    const cacheKey = `weather-icon-${cleanCity}-${cleanCountry}`;
    
    // Verificar caché primero
    const cached = weatherCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < WEATHER_CACHE_DURATION) {
      setWeatherCondition(cached.weatherCondition);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Obtener clima de la API
    const cityQuery = cleanCountry ? `${cleanCity},${cleanCountry}` : cleanCity;
    const weatherUrl = `${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(cityQuery)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`;
    
    let isCancelled = false;
    
    fetch(weatherUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(weatherData => {
        if (isCancelled) return;
        
        const weatherMain = weatherData.weather?.[0]?.main || '';
        const weatherDescription = weatherData.weather?.[0]?.description || '';
        
        // Guardar en caché
        weatherCache.set(cacheKey, {
          weatherCondition: { main: weatherMain, description: weatherDescription },
          timestamp: Date.now()
        });
        
        setWeatherCondition({ main: weatherMain, description: weatherDescription });
        setLoading(false);
      })
      .catch(() => {
        if (!isCancelled) {
          setWeatherCondition(null);
          setLoading(false);
        }
      });
    
    return () => {
      isCancelled = true;
    };
  }, [city, country]);

  return { weatherCondition, loading };
}


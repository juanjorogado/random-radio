import { useState, useEffect, useRef } from 'react';
import { fetchMetadata } from '../services/metadataService';

const METADATA_UPDATE_INTERVAL = 30000; // 30 segundos

/**
 * Hook para gestionar metadatos de la estación actual
 * @param {Object} station - Estación actual
 * @param {Function} onTrackUpdate - Callback cuando se actualiza la pista
 * @returns {Object} { currentTrack, isLoading }
 */
export function useMetadata(station, onTrackUpdate) {
  const [currentTrack, setCurrentTrack] = useState({
    title: 'Toca para lanzar una radio',
    artist: '',
    album: '',
    year: null,
    cover: null
  });
  const metadataTimerRef = useRef(null);

  useEffect(() => {
    if (!station) {
      setCurrentTrack({
        title: 'Toca para lanzar una radio',
        artist: '',
        album: '',
        year: null,
        cover: null
      });
      return;
    }

    // Cargar metadatos iniciales
    const loadMetadata = async () => {
      const track = await fetchMetadata(station);
      setCurrentTrack(track);
      if (onTrackUpdate) {
        onTrackUpdate(track, station);
      }
    };

    loadMetadata();

    // Limpiar timer anterior si existe
    if (metadataTimerRef.current) {
      clearInterval(metadataTimerRef.current);
    }

    // Configurar actualización periódica de metadatos
    metadataTimerRef.current = setInterval(() => {
      if (!document.hidden && station) {
        loadMetadata();
      }
    }, METADATA_UPDATE_INTERVAL);

    return () => {
      if (metadataTimerRef.current) {
        clearInterval(metadataTimerRef.current);
      }
    };
  }, [station?.id]); // Solo actualizar cuando cambia el ID de la estación

  return { currentTrack };
}

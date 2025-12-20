import { useState, useEffect, useRef } from 'react';
import { fetchMetadata } from '../services/metadataService';
import { recognizeTrack, isACRCloudConfigured } from '../services/audioRecognitionService';

const METADATA_UPDATE_INTERVAL = 30000; // 30 segundos
const ACRCLOUD_RETRY_DELAY = 60000; // 60 segundos entre intentos de ACRCloud

/**
 * Hook para gestionar metadatos de la estación actual
 * @param {Object} station - Estación actual
 * @param {HTMLAudioElement} audioElement - Elemento de audio para captura
 * @param {Function} onTrackUpdate - Callback cuando se actualiza la pista
 * @returns {Object} { currentTrack, isLoading }
 */
export function useMetadata(station, audioElement, onTrackUpdate) {
  const [currentTrack, setCurrentTrack] = useState({
    title: 'Toca para lanzar una radio',
    artist: '',
    album: '',
    year: null,
    cover: null
  });
  const metadataTimerRef = useRef(null);
  const lastACRCloudAttemptRef = useRef(0);
  const acrCloudAttemptedRef = useRef(false);

  useEffect(() => {
    if (!station) {
      setCurrentTrack({
        title: 'Toca para lanzar una radio',
        artist: '',
        album: '',
        year: null,
        cover: null
      });
      acrCloudAttemptedRef.current = false;
      return;
    }

    // Cargar metadatos iniciales
    const loadMetadata = async () => {
      const track = await fetchMetadata(station);
      setCurrentTrack(track);
      
      // Si no hay metadata válida y ACRCloud está configurado, intentar reconocimiento
      const hasValidMetadata = track.title && track.title !== 'Toca para lanzar una radio';
      const now = Date.now();
      const canRetryACRCloud = now - lastACRCloudAttemptRef.current > ACRCLOUD_RETRY_DELAY;
      
      if (!hasValidMetadata && 
          isACRCloudConfigured() && 
          audioElement?.current && 
          !audioElement.current.paused &&
          canRetryACRCloud) {
        
        console.log('⚠️ No hay metadata, intentando ACRCloud...');
        lastACRCloudAttemptRef.current = now;
        acrCloudAttemptedRef.current = true;
        
        try {
          const recognizedTrack = await recognizeTrack(audioElement.current);
          
          if (recognizedTrack) {
            const acrTrack = {
              ...recognizedTrack,
              source: 'acrcloud' // Marcar que viene de ACRCloud
            };
            setCurrentTrack(acrTrack);
            if (onTrackUpdate) {
              onTrackUpdate(acrTrack, station);
            }
          }
        } catch (error) {
          console.error('Error con ACRCloud:', error);
        }
      } else if (hasValidMetadata && onTrackUpdate) {
        acrCloudAttemptedRef.current = false;
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

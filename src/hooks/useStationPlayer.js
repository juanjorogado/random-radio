import { useRef, useCallback, useEffect } from 'react';
import stations from '../data/stations.json';
import { saveLastStation } from '../utils/lastStationStorage';
import { playSoundFeedback } from '../utils/soundFeedback';

const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 500;
const MAX_RETRY_DELAY = 8000;

/**
 * Hook para gestionar la reproducción de estaciones
 * @param {Object} audioPlayer - Objeto retornado por useAudioPlayer
 * @param {Function} onPlaySuccess - Callback cuando la reproducción inicia exitosamente
 * @returns {Object} { playStation, playRandomStation, togglePlay }
 */
export function useStationPlayer(audioPlayer, onPlaySuccess) {
  const startingRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const bufferingTimeoutRef = useRef(null);
  const completeTimeoutRef = useRef(null);

  // Limpiar timeouts al desmontar el componente
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
    };
  }, []);

  const {
    setSource,
    play,
    setPlaying,
    setBuffering,
    setBufferingComplete,
    setTapTransitioning
  } = audioPlayer;

  /**
   * Reproduce una estación
   */
  const playStation = useCallback((station, retryAttempt = 0, triedStations = new Set()) => {
    if (startingRef.current && retryAttempt === 0) return;
    
    // Limpiar timeout anterior si existe
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    startingRef.current = true;
    setTapTransitioning(true);
    
    // Limpiar timeouts anteriores
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
    }
    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
    }
    
    bufferingTimeoutRef.current = setTimeout(() => {
      setBuffering(true);
    }, 500);

    triedStations.add(station.id);
    setSource(station.stream);

    const handlePlaySuccess = () => {
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
      
      setPlaying(true);
      setBufferingComplete(true);
      
      completeTimeoutRef.current = setTimeout(() => {
        setBuffering(false);
        setBufferingComplete(false);
        completeTimeoutRef.current = null;
      }, 600);
      
      // Guardar última estación
      saveLastStation(station);
      
      // Feedback sonoro solo si es un cambio de estación (no un reintento)
      if (retryAttempt === 0) {
        playSoundFeedback();
      }
      
      if (onPlaySuccess) {
        onPlaySuccess(station);
      }
      
      startingRef.current = false;
    };

    const handlePlayError = () => {
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
      
      setPlaying(false);
      setBuffering(false);
      setBufferingComplete(false);
      setTapTransitioning(false);
      startingRef.current = false;

      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        // Backoff exponencial con jitter para evitar thundering herd
        const baseDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryAttempt);
        const jitter = Math.random() * baseDelay * 0.3; // 30% de jitter
        const delay = Math.min(baseDelay + jitter, MAX_RETRY_DELAY);
        
        retryTimeoutRef.current = setTimeout(() => {
          playStation(station, retryAttempt + 1, triedStations);
        }, delay);
      } else {
        // Intentar otra estación si esta falla completamente
        const availableStations = stations.filter(s => !triedStations.has(s.id));
        
        if (availableStations.length > 0) {
          const nextStation = availableStations[Math.floor(Math.random() * availableStations.length)];
          retryTimeoutRef.current = setTimeout(() => {
            playStation(nextStation, 0, triedStations);
          }, INITIAL_RETRY_DELAY);
        } else {
          // Si todas las estaciones fallaron, resetear y intentar de nuevo
          console.warn('Todas las estaciones fallaron al cargar, reiniciando...');
          triedStations.clear();
          const randomStation = stations[Math.floor(Math.random() * stations.length)];
          retryTimeoutRef.current = setTimeout(() => {
            playStation(randomStation, 0, triedStations);
          }, MAX_RETRY_DELAY);
        }
      }
    };

    play()
      .then(handlePlaySuccess)
      .catch(handlePlayError);
  }, [setSource, play, setPlaying, setBuffering, setBufferingComplete, setTapTransitioning, onPlaySuccess]);

  /**
   * Reproduce una estación aleatoria (excluyendo la actual si existe)
   */
  const playRandomStation = useCallback((excludeStationId = null) => {
    const availableStations = excludeStationId 
      ? stations.filter(s => s.id !== excludeStationId)
      : stations;
    
    if (availableStations.length === 0) {
      // Si solo hay una estación, usar esa
      playStation(stations[0]);
      return;
    }
    
    const random = availableStations[Math.floor(Math.random() * availableStations.length)];
    playStation(random);
  }, [playStation]);

  /**
   * Reproduce la estación siguiente en la lista
   */
  const playNextStation = useCallback((currentStationId) => {
    const currentIndex = stations.findIndex(s => s.id === currentStationId);
    const nextIndex = currentIndex >= 0 && currentIndex < stations.length - 1
      ? currentIndex + 1
      : 0;
    playStation(stations[nextIndex]);
  }, [playStation]);

  /**
   * Reproduce la estación anterior en la lista
   */
  const playPreviousStation = useCallback((currentStationId) => {
    const currentIndex = stations.findIndex(s => s.id === currentStationId);
    const prevIndex = currentIndex > 0
      ? currentIndex - 1
      : stations.length - 1;
    playStation(stations[prevIndex]);
  }, [playStation]);

  /**
   * Toggle play/pause
   */
  const togglePlay = useCallback((currentStation, playing) => {
    if (!currentStation) {
      playRandomStation();
      return;
    }
    
    if (playing) {
      audioPlayer.pause();
      setPlaying(false);
    } else {
      audioPlayer.play()
        .then(() => {
          setPlaying(true);
        })
        .catch(() => {
          if (currentStation) playStation(currentStation);
        });
    }
  }, [audioPlayer, setPlaying, playRandomStation, playStation]);

  return {
    playStation,
    playRandomStation,
    playNextStation,
    playPreviousStation,
    togglePlay
  };
}

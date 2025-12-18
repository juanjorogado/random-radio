import { useRef, useCallback } from 'react';
import stations from '../data/stations.json';

const MAX_RETRY_ATTEMPTS = 3;

/**
 * Hook para gestionar la reproducción de estaciones
 * @param {Object} audioPlayer - Objeto retornado por useAudioPlayer
 * @param {Function} onPlaySuccess - Callback cuando la reproducción inicia exitosamente
 * @returns {Object} { playStation, playRandomStation, togglePlay }
 */
export function useStationPlayer(audioPlayer, onPlaySuccess) {
  const startingRef = useRef(false);
  const retryTimeoutRef = useRef(null);

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
    
    startingRef.current = true;
    setTapTransitioning(true);
    
    setTimeout(() => {
      setBuffering(true);
    }, 500);

    triedStations.add(station.id);
    setSource(station.stream);

    const handlePlaySuccess = () => {
      setPlaying(true);
      setBufferingComplete(true);
      setTimeout(() => {
        setBuffering(false);
        setBufferingComplete(false);
      }, 600);
      
      if (onPlaySuccess) {
        onPlaySuccess(station);
      }
      
      startingRef.current = false;
    };

    const handlePlayError = () => {
      setPlaying(false);
      setBuffering(false);
      setBufferingComplete(false);
      setTapTransitioning(false);
      startingRef.current = false;

      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000);
        retryTimeoutRef.current = setTimeout(() => {
          playStation(station, retryAttempt + 1, triedStations);
        }, delay);
      } else {
        const availableStations = stations.filter(s => !triedStations.has(s.id));
        
        if (availableStations.length > 0) {
          const nextStation = availableStations[Math.floor(Math.random() * availableStations.length)];
          retryTimeoutRef.current = setTimeout(() => {
            playStation(nextStation, 0, triedStations);
          }, 1000);
        } else {
          console.warn('Todas las estaciones fallaron al cargar');
        }
      }
    };

    play()
      .then(handlePlaySuccess)
      .catch(handlePlayError);
  }, [setSource, play, setPlaying, setBuffering, setBufferingComplete, setTapTransitioning, onPlaySuccess]);

  /**
   * Reproduce una estación aleatoria
   */
  const playRandomStation = useCallback(() => {
    const random = stations[Math.floor(Math.random() * stations.length)];
    playStation(random);
  }, [playStation]);

  /**
   * Toggle play/pause
   */
  const togglePlay = useCallback((currentStation, playing, playFn) => {
    if (!currentStation) {
      playRandomStation();
      return;
    }
    
    if (playing) {
      audioPlayer.pause();
      setPlaying(false);
    } else {
      playFn().catch(() => {
        if (currentStation) playStation(currentStation);
      });
      setPlaying(true);
    }
  }, [audioPlayer, setPlaying, playRandomStation, playStation]);

  return {
    playStation,
    playRandomStation,
    togglePlay
  };
}

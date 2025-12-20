import { useState } from 'react';
import { useDebounce } from './useDebounce';
import { getAppleMusicLink } from '../utils/getAppleMusicLink';

const HISTORY_STORAGE_KEY = 'radio-history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Hook para gestionar el historial de pistas reproducidas
 * @returns {Object} { history, addTrack }
 */
export function useTrackHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Guardar historial en localStorage con debounce cuando cambie
  useDebounce(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('Error guardando historial:', err);
    }
  }, 500, [history]);

  /**
   * Añade una pista al historial si es válida
   * @param {Object} track - Información de la pista
   * @param {Object} station - Información de la estación
   */
  const addTrack = (track, station) => {
    const hasValidInfo = track.title && 
                        track.artist && 
                        track.title !== 'Información no disponible' &&
                        track.title !== 'Sin título' &&
                        track.title !== 'En vivo' &&
                        !track.title.startsWith('Escuchando');

    if (!hasValidInfo) return;

    setHistory((prev) => {
      // Verificar si la canción ya existe en el historial
      const isDuplicate = prev.some(
        (item) => item.title === track.title && item.artist === track.artist
      );
      
      if (isDuplicate) {
        return prev;
      }
      
      const newTrack = {
        ...track,
        station: station.name,
        city: station.city,
        country: station.country,
        time: new Date().toLocaleTimeString('es-ES'),
        appleMusicLink: getAppleMusicLink(track)
      };
      
      return [newTrack, ...prev].slice(0, MAX_HISTORY_ITEMS);
    });
  };

  return { history, addTrack };
}

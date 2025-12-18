const LAST_STATION_KEY = 'radio-last-station';

/**
 * Guarda la última estación reproducida
 * @param {Object} station - Objeto de estación
 */
export function saveLastStation(station) {
  try {
    localStorage.setItem(LAST_STATION_KEY, JSON.stringify(station));
  } catch (err) {
    console.warn('Error guardando última estación:', err);
  }
}

/**
 * Obtiene la última estación reproducida
 * @returns {Object|null} Estación guardada o null
 */
export function getLastStation() {
  try {
    const saved = localStorage.getItem(LAST_STATION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (err) {
    console.warn('Error obteniendo última estación:', err);
    return null;
  }
}

/**
 * Limpia la última estación guardada
 */
export function clearLastStation() {
  try {
    localStorage.removeItem(LAST_STATION_KEY);
  } catch (err) {
    console.warn('Error limpiando última estación:', err);
  }
}

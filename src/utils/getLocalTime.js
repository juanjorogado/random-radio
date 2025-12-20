/**
 * Obtiene la hora local formateada para una zona horaria
 * @param {string} timeZone - Zona horaria (ej: 'America/New_York')
 * @returns {string} Hora formateada (HH:mm) o '--:--' si hay error
 */
export function getLocalTime(timeZone) {
  try {
    return new Date().toLocaleTimeString('es-ES', {
      timeZone: timeZone,
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '--:--';
  }
}


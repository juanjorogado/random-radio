/**
 * Formatea la información de una pista en una sola línea
 * @param {Object} track - Objeto con información de la pista
 * @param {string} track.title - Título de la canción
 * @param {string} track.artist - Artista
 * @param {string} track.album - Álbum
 * @param {number} track.year - Año
 * @returns {string} Información formateada
 */
export function formatTrackInfo(track) {
  const parts = [];
  
  if (track.title) {
    parts.push(track.title);
  }
  
  if (track.artist) {
    parts.push(track.artist);
  }
  
  if (track.album) {
    const albumPart = track.album;
    if (track.year) {
      parts.push(`${albumPart} (${track.year})`);
    } else {
      parts.push(albumPart);
    }
  } else if (track.year) {
    // Si hay año pero no álbum, mostrarlo al final
    parts.push(`(${track.year})`);
  }
  
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  
  // Primer separador es ◌, el resto es —
  return parts[0] + ' ◌ ' + parts.slice(1).join(' — ');
}

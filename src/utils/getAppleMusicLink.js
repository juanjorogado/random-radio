/**
 * Genera un enlace de búsqueda en Apple Music para una pista
 * @param {Object} track - Objeto con información de la pista
 * @param {string} track.title - Título de la canción
 * @param {string} track.artist - Artista
 * @returns {string|null} URL de búsqueda en Apple Music o null si faltan datos
 */
export function getAppleMusicLink(track) {
  if (!track.title || !track.artist) return null;
  const query = encodeURIComponent(`${track.artist} ${track.title}`);
  return `https://music.apple.com/search?term=${query}`;
}

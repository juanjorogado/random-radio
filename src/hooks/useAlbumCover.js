import { useState, useEffect } from 'react';

const ITUNES_BASE_URL = 'https://itunes.apple.com/search';

/**
 * Hook para buscar la portada de un álbum usando iTunes Search API
 * @param {string} artist - Nombre del artista
 * @param {string} album - Nombre del álbum
 * @returns {object} { coverUrl: string|null, loading: boolean }
 */
export function useAlbumCover(artist, album) {
  const [coverUrl, setCoverUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Reset cuando cambian los parámetros
    setCoverUrl(null);
    
    // Solo buscar si tenemos artista y álbum
    if (!artist || !album) {
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

    // Construir búsqueda para iTunes API
    // Buscamos por artista y álbum, limitando a 1 resultado y solo álbumes
    const searchTerm = `${artist.trim()} ${album.trim()}`;
    const params = new URLSearchParams({
      term: searchTerm,
      media: 'music',
      entity: 'album',
      limit: '1'
    });

    fetch(`${ITUNES_BASE_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // iTunes devuelve results[0].artworkUrl100 o artworkUrl60
        // Reemplazamos el tamaño para obtener una imagen más grande (600x600)
        const result = data?.results?.[0];
        if (result?.artworkUrl100) {
          // Reemplazar tamaño 100x100 por 600x600 para mejor calidad
          const largeArtworkUrl = result.artworkUrl100
            .replace('100x100', '600x600')
            .replace('100x100bb', '600x600bb');
          setCoverUrl(largeArtworkUrl);
        } else if (result?.artworkUrl60) {
          const largeArtworkUrl = result.artworkUrl60
            .replace('60x60', '600x600')
            .replace('60x60bb', '600x600bb');
          setCoverUrl(largeArtworkUrl);
        }
      })
      .catch(err => {
        clearTimeout(timeoutId);
        if (err.name !== 'AbortError') {
          // Silenciosamente fallar - no es crítico si no se encuentra la imagen
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [artist, album]);

  return { coverUrl, loading };
}

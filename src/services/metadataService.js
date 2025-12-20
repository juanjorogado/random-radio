/**
 * Servicio para obtener metadatos de las estaciones de radio
 */

const METADATA_TIMEOUT = 10000; // 10 segundos

/**
 * Obtiene los metadatos de una estación de radio
 * @param {Object} station - Objeto con información de la estación
 * @returns {Promise<Object>} Objeto con información de la pista actual
 */
export async function fetchMetadata(station) {
  if (!station?.metadataUrl) {
    return {
      title: `Escuchando ${station.name}`,
      artist: '',
      album: '',
      year: null,
      cover: null
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT);

    const res = await fetch(station.metadataUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status} ${res.statusText} - ${station.name}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Respuesta no es JSON - ${station.name}`);
    }

    const data = await res.json();
    return parseMetadataByStation(station.id, data, station);
  } catch (err) {
    handleMetadataError(err, station);
    return {
      title: `Escuchando ${station.name}`,
      artist: '',
      album: '',
      year: null,
      cover: null
    };
  }
}

/**
 * Parsea los metadatos según el tipo de estación
 * @param {string} stationId - ID de la estación
 * @param {Object} data - Datos JSON recibidos
 * @param {Object} station - Objeto con información de la estación
 * @returns {Object} Objeto con información de la pista
 */
function parseMetadataByStation(stationId, data, station) {
  let track = {
    title: 'Información no disponible',
    artist: '',
    album: '',
    year: null,
    cover: null
  };

  switch (stationId) {
    case 'kexp':
      track = parseKEXP(data);
      break;
    case 'rp':
      track = parseRadioParadise(data);
      break;
    case 'fip':
      track = parseFIP(data);
      break;
    case 'nts':
      track = parseNTS(data);
      break;
    default:
      track = {
        title: `Escuchando ${station.name}`,
        artist: '',
        album: '',
        year: null,
        cover: null
      };
  }

  return track;
}

/**
 * Parsea metadatos de KEXP
 */
function parseKEXP(data) {
  const play = data.results?.[0];
  if (!play) {
    return {
      title: 'Sin título',
      artist: '',
      album: '',
      year: null,
      cover: null
    };
  }

  return {
    title: play.song || 'Sin título',
    artist: play.artist || '',
    album: play.album || '',
    year: play.release_date ? new Date(play.release_date).getFullYear() : null,
    cover: play.thumbnail_uri || null
  };
}

/**
 * Parsea metadatos de Radio Paradise
 */
function parseRadioParadise(data) {
  if (!data.title) {
    return {
      title: 'Información no disponible',
      artist: '',
      album: '',
      year: null,
      cover: null
    };
  }

  return {
    title: data.title,
    artist: data.artist || '',
    album: data.album || '',
    year: data.year || null,
    cover: data.cover ? `https://img.radioparadise.com/${data.cover}` : null
  };
}

/**
 * Parsea metadatos de FIP
 */
function parseFIP(data) {
  const now = data?.now;
  if (!now) {
    return {
      title: 'Sin título',
      artist: '',
      album: '',
      year: null,
      cover: null
    };
  }

  return {
    title: now.secondLine || now.firstLine || 'Sin título',
    artist: now.firstLine || '',
    album: '',
    year: null,
    cover: now.cover || null
  };
}

/**
 * Parsea metadatos de NTS
 */
function parseNTS(data) {
  const live = data?.results?.[0];
  if (!live?.now) {
    return {
      title: 'En vivo',
      artist: '',
      album: '',
      year: null,
      cover: null
    };
  }

  return {
    title: live.now.broadcast_title ||
           live.now.embeds?.details?.name ||
           'En vivo',
    artist: live.now.embeds?.details?.description || '',
    album: '',
    year: null,
    cover: live.now.embeds?.details?.media?.picture_large || null
  };
}

/**
 * Maneja errores al obtener metadatos
 */
function handleMetadataError(err, station) {
  if (err.name === 'AbortError') {
    console.error(`[${station.name}] Timeout al obtener metadatos: la petición tardó más de 10 segundos`);
  } else if (err instanceof TypeError && err.message.includes('fetch')) {
    console.error(`[${station.name}] Error de red: no se pudo conectar con la API de metadatos`, err.message);
  } else if (err instanceof SyntaxError) {
    console.error(`[${station.name}] Error al parsear JSON: respuesta inválida de la API`, err.message);
  } else {
    console.error(`[${station.name}] Error al obtener metadatos:`, err.message || err);
  }
}



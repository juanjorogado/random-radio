/**
 * Servicio de reconocimiento de audio usando ACRCloud
 */

// Configuración de ACRCloud
const ACRCLOUD_CONFIG = {
  bearerToken: process.env.REACT_APP_ACRCLOUD_BEARER_TOKEN || '',
  endpoint: 'https://eu-api-v2.acrcloud.com/api/external-metadata/tracks'
};

/**
 * Captura audio del stream usando Web Audio API
 * @param {HTMLAudioElement} audioElement - Elemento de audio
 * @param {number} durationMs - Duración de la captura en milisegundos
 * @returns {Promise<Blob>} Audio capturado como Blob
 */
async function captureAudioFromStream(audioElement, durationMs = 10000) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audioElement);
    const destination = audioContext.createMediaStreamDestination();
    
    // Conectar source a destination y también al output para no interrumpir la reproducción
    source.connect(destination);
    source.connect(audioContext.destination);
    
    // Usar MediaRecorder para grabar el audio
    const mediaRecorder = new MediaRecorder(destination.stream);
    const chunks = [];
    
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        audioContext.close();
        resolve(blob);
      };
      
      mediaRecorder.onerror = (error) => {
        audioContext.close();
        reject(error);
      };
      
      mediaRecorder.start();
      
      // Detener después del tiempo especificado
      setTimeout(() => {
        mediaRecorder.stop();
      }, durationMs);
    });
  } catch (error) {
    console.error('Error capturando audio:', error);
    throw error;
  }
}

/**
 * Reconoce la canción usando ACRCloud
 * @param {HTMLAudioElement} audioElement - Elemento de audio reproduciendo
 * @returns {Promise<Object|null>} Información del track o null si no se reconoce
 */
export async function recognizeTrack(audioElement) {
  const { bearerToken, endpoint } = ACRCLOUD_CONFIG;
  
  // Verificar que tengamos el token
  if (!bearerToken) {
    console.warn('ACRCloud: Bearer token no configurado');
    return null;
  }
  
  try {
    // Capturar audio del stream
    console.log('🎵 ACRCloud: Capturando audio...');
    const audioBlob = await captureAudioFromStream(audioElement, 10000);
    
    // Preparar datos para ACRCloud
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    
    // Enviar a ACRCloud con Bearer Token
    console.log('🎵 ACRCloud: Enviando para reconocimiento...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ACRCloud error ${response.status}:`, errorText);
      throw new Error(`ACRCloud error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🎵 ACRCloud respuesta:', data);
    
    // Parsear respuesta de ACRCloud External Metadata API
    if (data && data.data && data.data.length > 0) {
      const track = data.data[0];
      console.log('✅ ACRCloud: Canción reconocida', track);
      
      return {
        title: track.name || track.title || '',
        artist: track.artists?.[0]?.name || track.artist || '',
        album: track.album?.name || track.album || '',
        year: track.release_date ? new Date(track.release_date).getFullYear() : null,
        cover: track.album?.cover || track.cover_image || null,
        // Información adicional que podría ser útil
        isrc: track.isrc || null,
        duration: track.duration_ms || null,
        spotify: track.external_ids?.spotify || null,
        appleMusic: track.external_ids?.apple_music || null
      };
    } else {
      console.log('❌ ACRCloud: No se pudo reconocer la canción');
      return null;
    }
  } catch (error) {
    console.error('Error reconociendo audio con ACRCloud:', error);
    return null;
  }
}

/**
 * Verifica si ACRCloud está configurado
 * @returns {boolean}
 */
export function isACRCloudConfigured() {
  return !!ACRCLOUD_CONFIG.bearerToken;
}


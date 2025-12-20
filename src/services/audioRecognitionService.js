/**
 * Servicio de reconocimiento de audio usando ACRCloud
 */

// Configuración de ACRCloud
const ACRCLOUD_CONFIG = {
  host: 'identify-eu-west-1.acrcloud.com',
  access_key: process.env.REACT_APP_ACRCLOUD_ACCESS_KEY || '',
  access_secret: process.env.REACT_APP_ACRCLOUD_ACCESS_SECRET || '',
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
 * Genera la firma HMAC requerida por ACRCloud
 */
async function generateSignature(audioData, timestamp) {
  const { access_key, access_secret } = ACRCLOUD_CONFIG;
  
  const stringToSign = [
    'POST',
    '/v1/identify',
    access_key,
    'audio',
    '1',
    timestamp
  ].join('\n');
  
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(access_secret),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(stringToSign)
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  } catch (error) {
    console.error('Error generando firma:', error);
    return '';
  }
}

/**
 * Reconoce la canción usando ACRCloud
 * @param {HTMLAudioElement} audioElement - Elemento de audio reproduciendo
 * @returns {Promise<Object|null>} Información del track o null si no se reconoce
 */
export async function recognizeTrack(audioElement) {
  const { host, access_key, access_secret } = ACRCLOUD_CONFIG;
  
  // Verificar que tengamos las credenciales
  if (!access_key || !access_secret) {
    console.warn('ACRCloud: Credenciales no configuradas');
    return null;
  }
  
  try {
    // Capturar audio del stream
    console.log('🎵 ACRCloud: Capturando audio...');
    const audioBlob = await captureAudioFromStream(audioElement, 10000);
    
    // Preparar datos para ACRCloud
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await generateSignature(audioBlob, timestamp);
    
    const formData = new FormData();
    formData.append('sample', audioBlob, 'audio.webm');
    formData.append('access_key', access_key);
    formData.append('data_type', 'audio');
    formData.append('signature_version', '1');
    formData.append('signature', signature);
    formData.append('sample_bytes', audioBlob.size.toString());
    formData.append('timestamp', timestamp.toString());
    
    // Enviar a ACRCloud
    console.log('🎵 ACRCloud: Enviando para reconocimiento...');
    const response = await fetch(`https://${host}/v1/identify`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`ACRCloud error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parsear respuesta
    if (data.status?.code === 0 && data.metadata?.music?.length > 0) {
      const track = data.metadata.music[0];
      console.log('✅ ACRCloud: Canción reconocida', track);
      
      return {
        title: track.title || '',
        artist: track.artists?.[0]?.name || '',
        album: track.album?.name || '',
        year: track.release_date ? new Date(track.release_date).getFullYear() : null,
        cover: track.album?.cover || null,
        // Información adicional que podría ser útil
        isrc: track.external_ids?.isrc || null,
        duration: track.duration_ms || null,
        spotify: track.external_metadata?.spotify?.track?.id 
          ? `https://open.spotify.com/track/${track.external_metadata.spotify.track.id}`
          : null,
        appleMusic: track.external_metadata?.apple_music?.track?.id
          ? `https://music.apple.com/track/${track.external_metadata.apple_music.track.id}`
          : null
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
  return !!(ACRCLOUD_CONFIG.access_key && ACRCLOUD_CONFIG.access_secret);
}


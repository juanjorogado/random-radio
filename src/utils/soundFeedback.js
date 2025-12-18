/**
 * Reproduce un sonido sutil para feedback al cambiar de estación
 */
let audioContext = null;
let soundEnabled = true;

/**
 * Inicializa el contexto de audio (solo se crea una vez)
 */
function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.warn('Web Audio API no disponible');
      return null;
    }
  }
  return audioContext;
}

/**
 * Reproduce un sonido sutil (beep corto y suave)
 * @param {number} frequency - Frecuencia del sonido (por defecto 800Hz)
 * @param {number} duration - Duración en milisegundos (por defecto 50ms)
 */
export function playSoundFeedback(frequency = 800, duration = 50) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Si el contexto está suspendido (requiere interacción del usuario), intentar reanudarlo
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {
      // Ignorar si no se puede reanudar
    });
    return;
  }

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Envelope suave
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (err) {
    // Silenciar errores
  }
}

/**
 * Habilita o deshabilita el feedback sonoro
 */
export function setSoundFeedbackEnabled(enabled) {
  soundEnabled = enabled;
}

/**
 * Verifica si el feedback sonoro está habilitado
 */
export function isSoundFeedbackEnabled() {
  return soundEnabled;
}

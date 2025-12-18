/**
 * Proporciona feedback háptico si está disponible
 * @param {string} type - Tipo de vibración: 'light', 'medium', 'heavy', 'success', 'warning', 'error'
 */
export function hapticFeedback(type = 'light') {
  if (!('vibrate' in navigator)) {
    return;
  }

  const patterns = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 50, 20],
    error: [30, 100, 30]
  };

  const pattern = patterns[type] || patterns.light;
  
  try {
    navigator.vibrate(pattern);
  } catch (err) {
    // Silenciar errores si la vibración no está disponible o está bloqueada
  }
}

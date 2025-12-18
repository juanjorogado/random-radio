import { useEffect, useRef } from 'react';

/**
 * Hook para prevenir que la pantalla se apague mientras se reproduce audio
 * @param {boolean} enabled - Si debe mantener la pantalla activa
 */
export function useWakeLock(enabled) {
  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) {
      return;
    }

    const requestWakeLock = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        
        // Manejar cuando se libera el wake lock (por ejemplo, cuando el usuario cambia de pestaña)
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch (err) {
        // Silenciar errores si el navegador no soporta o rechaza la solicitud
        console.warn('No se pudo activar el wake lock:', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {
          // Ignorar errores al liberar
        });
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}

import { useEffect, useRef } from 'react';

/**
 * Hook para debounce de valores
 * @param {Function} callback - Función a ejecutar después del delay
 * @param {number} delay - Tiempo de espera en ms
 * @param {Array} dependencies - Dependencias que activan el debounce
 */
export function useDebounce(callback, delay, dependencies) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Crear nuevo timeout
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);
}


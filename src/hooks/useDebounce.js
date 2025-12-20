import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para debounce de valores
 * @param {Function} callback - Función a ejecutar después del delay
 * @param {number} delay - Tiempo de espera en ms
 * @param {Array} dependencies - Dependencias que activan el debounce
 */
export function useDebounce(callback, delay, dependencies = []) {
  const timeoutRef = useRef(null);
  
  // Memoize the callback to prevent unnecessary re-renders
  const memoizedCallback = useCallback(
    (...args) => callback(...args),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, ...dependencies]
  );

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      memoizedCallback();
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [memoizedCallback, delay]); // Add delay to dependencies
}


import { useCallback } from 'react';

/**
 * Hook para gestionar el tap en la portada
 * @param {Function} onTap - Callback para tap
 * @returns {Function} Handler para el evento de click
 */
export function useCoverTap(onTap) {
  const handleCoverTap = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onTap) {
      onTap();
    }
  }, [onTap]);

  return handleCoverTap;
}


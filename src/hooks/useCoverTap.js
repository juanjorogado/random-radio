import { useCallback } from 'react';
import { hapticFeedback } from '../utils/hapticFeedback';

/**
 * Hook para gestionar el tap en la portada
 * @param {Function} onTap - Callback para tap
 * @returns {Function} Handler para el evento de click
 */
export function useCoverTap(onTap) {
  const handleCoverTap = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Feedback háptico inmediato
    hapticFeedback('light');
    
    if (onTap) {
      onTap();
    }
  }, [onTap]);

  return handleCoverTap;
}


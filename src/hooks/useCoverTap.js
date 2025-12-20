import { useRef, useCallback } from 'react';
import { hapticFeedback } from '../utils/hapticFeedback';

const DOUBLE_TAP_DELAY = 300;

/**
 * Hook para gestionar los gestos de tap en la portada
 * @param {Function} onSingleTap - Callback para tap simple
 * @param {Function} onDoubleTap - Callback para doble tap
 * @returns {Function} Handler para el evento de click
 */
export function useCoverTap(onSingleTap, onDoubleTap) {
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);

  const handleCoverTap = useCallback((e) => {
    const now = Date.now();
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Es un doble tap
      e.preventDefault();
      e.stopPropagation();
      
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      
      // Feedback háptico para doble tap
      hapticFeedback('medium');
      
      if (onDoubleTap) {
        onDoubleTap();
      }
      
      lastTapRef.current = 0;
    } else {
      // Primer tap, esperar para ver si hay segundo
      lastTapRef.current = now;
      
      // Feedback háptico inmediato en el primer tap
      hapticFeedback('light');
      
      tapTimeoutRef.current = setTimeout(() => {
        // Si pasó el tiempo sin segundo tap, es un tap simple
        if (lastTapRef.current === now) {
          if (onSingleTap) {
            onSingleTap();
          }
        }
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [onSingleTap, onDoubleTap]);

  return handleCoverTap;
}


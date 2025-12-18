import { useState, useEffect } from 'react';

export function useImageStatus(src) {
  const [status, setStatus] = useState('idle'); // idle | loading | loaded | error

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      return;
    }

    setStatus('loading');
    const img = new Image();

    const handleLoad = () => {
      setStatus('loaded');
    };

    const handleError = () => {
      setStatus('error');
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return status;
}

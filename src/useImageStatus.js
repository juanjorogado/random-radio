import { useState, useEffect } from 'react';

export function useImageStatus(src) {
  const [status, setStatus] = useState('idle'); // idle | loading | loaded | error

  useEffect(() => {
    if (!src) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    const img = new Image();

    img.onload = () => setStatus('loaded');
    img.onerror = () => setStatus('error');
    img.src = src;
  }, [src]);

  return status;
}

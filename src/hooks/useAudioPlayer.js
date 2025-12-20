import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook para gestionar el reproductor de audio
 * @param {Object} audioRef - Ref del elemento audio
 * @returns {Object} Estado y funciones del reproductor
 */
export function useAudioPlayer(audioRef) {
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [bufferingComplete, setBufferingComplete] = useState(false);
  const [tapTransitioning, setTapTransitioning] = useState(false);
  
  const waitingHandlerRef = useRef(null);
  const playingHandlerRef = useRef(null);
  const canplayHandlerRef = useRef(null);
  const bufferingTimeoutRef = useRef(null);

  // Configurar event listeners del audio
  useEffect(() => {
    waitingHandlerRef.current = () => {
      // Limpiar timeout anterior si existe
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
      setBuffering(true);
      setBufferingComplete(false);
      setTapTransitioning(false);
    };
    
    playingHandlerRef.current = () => {
      setBufferingComplete(true);
      // Limpiar timeout anterior si existe
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
      bufferingTimeoutRef.current = setTimeout(() => {
        setBuffering(false);
        bufferingTimeoutRef.current = null;
      }, 600);
    };
    
    canplayHandlerRef.current = () => {
      setBufferingComplete(true);
      // Limpiar timeout anterior si existe
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
      bufferingTimeoutRef.current = setTimeout(() => {
        setBuffering(false);
        bufferingTimeoutRef.current = null;
      }, 600);
    };
    
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('waiting', waitingHandlerRef.current);
      audio.addEventListener('playing', playingHandlerRef.current);
      audio.addEventListener('canplay', canplayHandlerRef.current);
    }
    
    return () => {
      if (audio && waitingHandlerRef.current && playingHandlerRef.current && canplayHandlerRef.current) {
        audio.removeEventListener('waiting', waitingHandlerRef.current);
        audio.removeEventListener('playing', playingHandlerRef.current);
        audio.removeEventListener('canplay', canplayHandlerRef.current);
      }
      // Limpiar timeout al desmontar
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
    };
  }, [audioRef]);

  // Resetear bufferingComplete después de la animación
  useEffect(() => {
    if (!buffering && bufferingComplete) {
      const timer = setTimeout(() => {
        setBufferingComplete(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [buffering, bufferingComplete]);

  const play = useCallback(() => {
    if (audioRef.current) {
      return audioRef.current.play();
    }
    return Promise.reject(new Error('Audio element not available'));
  }, [audioRef]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [audioRef]);

  const setSource = useCallback((src) => {
    if (audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.load();
    }
  }, [audioRef]);

  return {
    playing,
    setPlaying,
    buffering,
    setBuffering,
    bufferingComplete,
    setBufferingComplete,
    tapTransitioning,
    setTapTransitioning,
    play,
    pause,
    setSource
  };
}

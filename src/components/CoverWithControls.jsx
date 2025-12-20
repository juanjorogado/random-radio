import React, { useRef, useState, useEffect } from 'react';
import AlbumCover from './AlbumCover';
import TapIndicator from './TapIndicator';
import BufferingIndicator from './BufferingIndicator';

const MIN_SWIPE_DISTANCE = 50;
const MAX_VERTICAL_DISTANCE = 100;

/**
 * Componente que envuelve la portada con controles e indicadores
 */
export default function CoverWithControls({
  currentTrack,
  currentStation,
  playing,
  buffering,
  bufferingComplete,
  tapTransitioning,
  onCoverTap,
  onSwipeLeft,
  onSwipeRight
}) {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const gestureDetected = useRef(false);
  const [swipeAnimation, setSwipeAnimation] = useState(null);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    gestureDetected.current = false;
  };

  const handleTouchMove = (e) => {
    // No necesitamos hacer nada aquí, decidimos el gesto en touchEnd
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Swipe horizontal - izquierda o derecha
    if (absDeltaX > MIN_SWIPE_DISTANCE && absDeltaY < MAX_VERTICAL_DISTANCE) {
      e.preventDefault();
      e.stopPropagation();
      gestureDetected.current = true;
      
      if (deltaX < 0 && onSwipeLeft) {
        setSwipeAnimation('left');
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        setSwipeAnimation('right');
        onSwipeRight();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Limpiar animación después de que termine
  useEffect(() => {
    if (swipeAnimation) {
      const timer = setTimeout(() => {
        setSwipeAnimation(null);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [swipeAnimation]);

  const handleClick = (e) => {
    // Prevenir click si se detectó un gesto
    if (gestureDetected.current) {
      e.preventDefault();
      e.stopPropagation();
      gestureDetected.current = false;
      return;
    }
    
    if (onCoverTap) {
      onCoverTap(e);
    }
  };

  return (
    <div
      className={`cover-with-controls ${playing ? 'cover-playing' : ''} ${swipeAnimation ? `swipe-${swipeAnimation}` : ''}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AlbumCover
        src={currentTrack.cover || null}
        stationId={currentStation?.id}
        stationName={currentStation?.name}
        city={currentStation?.city}
        country={currentStation?.country}
        artist={currentTrack.artist}
        album={currentTrack.album}
        stationLogo={currentStation?.logo}
      />
      
      {!playing && !buffering && !bufferingComplete && (
        <TapIndicator transitioning={tapTransitioning} />
      )}
      
      {(buffering || bufferingComplete) && (
        <BufferingIndicator complete={bufferingComplete} />
      )}
    </div>
  );
}

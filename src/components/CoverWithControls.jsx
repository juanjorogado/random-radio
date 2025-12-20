import React, { useRef } from 'react';
import AlbumCover from './AlbumCover';
import TapIndicator from './TapIndicator';
import BufferingIndicator from './BufferingIndicator';
import { hapticFeedback } from '../utils/hapticFeedback';

const MIN_SWIPE_DISTANCE = 50;
const MAX_VERTICAL_DISTANCE = 100;
const MIN_PULL_DOWN_DISTANCE = 80;

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
  onSwipeRight,
  onPullDown
}) {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
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

    // Determinar qué gesto se hizo basado en la dirección predominante
    const isHorizontal = absDeltaX > absDeltaY;
    const isVertical = absDeltaY > absDeltaX;

    // Pull down - deslizar hacia abajo (vertical hacia abajo con distancia mínima)
    if (isVertical && deltaY > MIN_PULL_DOWN_DISTANCE && onPullDown) {
      hapticFeedback('medium');
      onPullDown();
    }
    // Swipe horizontal - izquierda o derecha
    else if (isHorizontal && absDeltaX > MIN_SWIPE_DISTANCE && absDeltaY < MAX_VERTICAL_DISTANCE) {
      hapticFeedback('light');
      if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className={`cover-with-controls ${playing ? 'cover-playing' : ''}`}
      onClick={onCoverTap}
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

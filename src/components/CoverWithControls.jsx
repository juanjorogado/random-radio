import React, { useRef } from 'react';
import AlbumCover from './AlbumCover';
import TapIndicator from './TapIndicator';
import BufferingIndicator from './BufferingIndicator';

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
  const isSwipe = useRef(false);

  const handleTouchStart = (e) => {
    if (onSwipeLeft || onSwipeRight) {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    }
  };

  const handleTouchMove = (e) => {
    if ((onSwipeLeft || onSwipeRight) && touchStartX.current !== null) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);
      
      if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
        isSwipe.current = true;
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    const MIN_SWIPE_DISTANCE = 50;
    const MAX_VERTICAL_DISTANCE = 100;

    if (isSwipe.current && Math.abs(deltaX) > MIN_SWIPE_DISTANCE && deltaY < MAX_VERTICAL_DISTANCE) {
      if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isSwipe.current = false;
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

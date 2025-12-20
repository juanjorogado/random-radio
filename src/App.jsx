import React, { useState, useEffect, useRef, useCallback } from 'react';

import './RadioApp.css';
import StationHeader from './components/StationHeader';
import Clocks from './components/Clocks';
import CoverWithControls from './components/CoverWithControls';
import TrackInfo from './components/TrackInfo';
import HistoryDrawer from './components/HistoryDrawer';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useStationPlayer } from './hooks/useStationPlayer';
import { useMetadata } from './hooks/useMetadata';
import { useTrackHistory } from './hooks/useTrackHistory';
import { useCoverTap } from './hooks/useCoverTap';
import { useWakeLock } from './hooks/useWakeLock';
import { getLocalTime } from './utils/getLocalTime';
import { getLastStation } from './utils/lastStationStorage';
import stations from './data/stations.json';

function RadioApp() {
  const audioRef = useRef(null);
  const [currentStation, setCurrentStation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs para swipe del drawer
  const drawerTouchStartYRef = useRef(null);
  const drawerTouchStartXRef = useRef(null);
  
  // Audio player hook
  const audioPlayer = useAudioPlayer(audioRef);
  const {
    playing,
    buffering,
    bufferingComplete,
    tapTransitioning
  } = audioPlayer;

  // Track history hook
  const { history, addTrack } = useTrackHistory();

  // Callback estable para actualizar track
  const handleTrackUpdate = useCallback((track, station) => {
    addTrack(track, station);
  }, [addTrack]);

  // Metadata hook
  const { currentTrack } = useMetadata(currentStation, handleTrackUpdate);

  // Station player hook
  const { playStation, playRandomStation, playNextStation, playPreviousStation, togglePlay } = useStationPlayer(
    audioPlayer,
    setCurrentStation
  );

  // Restaurar última estación al iniciar
  useEffect(() => {
    if (!isInitialized) {
      const lastStation = getLastStation();
      if (lastStation) {
        // Verificar que la estación aún existe en la lista
        const stationExists = stations.find(s => s.id === lastStation.id);
        if (stationExists) {
          // Pequeño delay para asegurar que el audio está listo
          const initTimeout = setTimeout(() => {
            playStation(stationExists);
          }, 100);
          
          return () => clearTimeout(initTimeout);
        }
      }
      setIsInitialized(true);
    }
  }, [isInitialized, playStation]);

  // Prevenir que la pantalla se apague cuando está reproduciendo
  useWakeLock(playing);

  // Cover tap handler
  const handleTap = useCallback(() => {
    togglePlay(currentStation, playing);
  }, [togglePlay, currentStation, playing]);

  const handleCoverTap = useCoverTap(handleTap);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Swipe handlers para cambiar estación
  const handleSwipeLeft = useCallback(() => {
    currentStation ? playNextStation(currentStation.id) : playRandomStation();
  }, [currentStation, playNextStation, playRandomStation]);
  
  const handleSwipeRight = useCallback(() => {
    currentStation ? playPreviousStation(currentStation.id) : playRandomStation();
  }, [currentStation, playPreviousStation, playRandomStation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.matches('input, textarea')) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleTap();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSwipeRight(); // Anterior (izquierda en teclado = anterior)
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSwipeLeft(); // Siguiente (derecha en teclado = siguiente)
          break;
        case 'Enter':
          e.preventDefault();
          handleTap();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleTap, handleSwipeLeft, handleSwipeRight]);

  return (
    <div className="radio-app">
      <audio ref={audioRef} crossOrigin="anonymous" />

      <div className="main-container">
        <div key={currentStation?.id || 'no-station'} className="station-data-container">
          <StationHeader 
            currentStation={currentStation} 
            playing={playing} 
          />
          
          <Clocks 
            currentStation={currentStation} 
            currentTime={currentTime} 
            getLocalTime={getLocalTime} 
          />

          <CoverWithControls
            currentTrack={currentTrack}
            currentStation={currentStation}
            playing={playing}
            buffering={buffering}
            bufferingComplete={bufferingComplete}
            tapTransitioning={tapTransitioning}
            onCoverTap={handleCoverTap}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />

          <TrackInfo track={currentTrack} />
        </div>
      </div>

      <HistoryDrawer
        history={history}
        historyOpen={historyOpen}
        setHistoryOpen={setHistoryOpen}
        drawerTouchStartYRef={drawerTouchStartYRef}
        drawerTouchStartXRef={drawerTouchStartXRef}
      />
    </div>
  );
}

export default RadioApp;
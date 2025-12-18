import React, { useState, useEffect, useRef } from 'react';

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
import { getLocalTime } from './utils/getLocalTime';

function RadioApp() {
  const audioRef = useRef(null);
  const [currentStation, setCurrentStation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [historyOpen, setHistoryOpen] = useState(false);
  
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

  // Metadata hook
  const { currentTrack } = useMetadata(currentStation, (track, station) => {
    addTrack(track, station);
  });

  // Station player hook
  const handlePlaySuccess = (station) => {
    setCurrentStation(station);
  };
  
  const { playStation, playRandomStation, togglePlay } = useStationPlayer(
    audioPlayer,
    handlePlaySuccess
  );

  // Cover tap handlers
  const handleSingleTap = () => {
    togglePlay(currentStation, playing);
  };

  const handleDoubleTap = () => {
    playRandomStation();
  };

  const handleCoverTap = useCoverTap(handleSingleTap, handleDoubleTap);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard: espacio para play/pause
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        handleSingleTap();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStation, playing]);

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
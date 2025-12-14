import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, List, X } from 'lucide-react';
import './RadioApp.css';

const RadioApp = () => {
  const [stations] = useState([
    { name: "KEXP", country: "USA", city: "Seattle", timezone: "America/Los_Angeles", stream: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/KEXP_logo.svg/1200px-KEXP_logo.svg.png" },
    { name: "FIP", country: "Francia", city: "París", timezone: "Europe/Paris", stream: "https://icecast.radiofrance.fr/fip-midfi.mp3", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/FIP_logo_2021.svg/1200px-FIP_logo_2021.svg.png" },
    { name: "Triple J", country: "Australia", city: "Sídney", timezone: "Australia/Sydney", stream: "https://live-radio01.mediahubaustralia.com/2TJW/mp3/", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/3/34/Triple_J_logo_2018.svg/1200px-Triple_J_logo_2018.svg.png" },
    { name: "BBC 6 Music", country: "Reino Unido", city: "Londres", timezone: "Europe/London", stream: "https://stream.live.vc.bbcmedia.co.uk/bbc_6music", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/BBC_Radio_6_Music.svg/1200px-BBC_Radio_6_Music.svg.png" },
    { name: "Radio Paradise", country: "USA", city: "California", timezone: "America/Los_Angeles", stream: "https://stream.radioparadise.com/mp3-128", logo: "https://img.radioparadise.com/covers/l/B000000.jpg" },
    { name: "Worldwide FM", country: "Reino Unido", city: "Londres", timezone: "Europe/London", stream: "https://worldwidefm.out.airtime.pro/worldwidefm_a", logo: "https://pbs.twimg.com/profile_images/1354776313754378240/N3yIpZJq_400x400.jpg" },
    { name: "NTS Radio", country: "Reino Unido", city: "Londres", timezone: "Europe/London", stream: "https://stream-mixtape-geo.ntslive.net/mixtape", logo: "https://pbs.twimg.com/profile_images/1630226075535544320/xrT89-vr_400x400.jpg" },
    { name: "Dublab", country: "USA", city: "Los Ángeles", timezone: "America/Los_Angeles", stream: "https://dublab.out.airtime.pro/dublab_a", logo: "https://pbs.twimg.com/profile_images/1362862392909414402/c5kVlKNp_400x400.jpg" }
  ]);

  const [playing, setPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({
    title: "Esperando conexión...",
    artist: "",
    album: "",
    cover: null
  });
  
  const audioRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getLocalTime = (timezone) => {
    try {
      return new Date().toLocaleTimeString('es-ES', { 
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  };

  const playRandomStation = () => {
    const random = stations[Math.floor(Math.random() * stations.length)];
    setCurrentStation(random);
    
    if (audioRef.current) {
      audioRef.current.src = random.stream;
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlaying(true);
          })
          .catch(err => {
            console.error("Error al reproducir:", err);
            setPlaying(false);
            alert("Toca el botón de play para iniciar la reproducción");
          });
      }
    }

    setTimeout(() => {
      const mockTrack = {
        title: "Título de la canción que se está reproduciendo en este momento",
        artist: "Nombre del artista",
        album: "Álbum",
        cover: null
      };
      setCurrentTrack(mockTrack);
      
      const historyItem = {
        ...mockTrack,
        station: random.name,
        country: random.country,
        city: random.city,
        time: new Date().toLocaleTimeString('es-ES')
      };
      setHistory(prev => [historyItem, ...prev]);
    }, 1000);
  };

  const togglePlay = () => {
    if (!currentStation) {
      playRandomStation();
      return;
    }

    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      audioRef.current?.play().catch(err => console.error(err));
      setPlaying(true);
    }
  };

  return (
    <div className="radio-app">
      <audio ref={audioRef} crossOrigin="anonymous" />
      
      {!showHistory ? (
        <div className="main-container">
          
          {/* Carátula */}
          <div className="album-cover-container">
            <div className="album-cover">
              {currentTrack.cover ? (
                <img src={currentTrack.cover} alt="Album" className="album-cover-image" />
              ) : currentStation ? (
                <img src={currentStation.logo} alt={currentStation.name} className="album-cover-logo" />
              ) : (
                <div className="album-cover-placeholder">🎵</div>
              )}
            </div>
          </div>

          {/* Info canción con marquee */}
          <div className="track-info-container">
            <div className="track-title-wrapper">
              <h1 className="track-title">{currentTrack.title}</h1>
            </div>
            <p className="track-artist">{currentTrack.artist}</p>
          </div>

          {/* Info radio */}
          {currentStation && (
            <div className="station-info-container">
              <div className="station-card">
                <p className="station-name">{currentStation.name}</p>
                <p className="station-location">{currentStation.city}, {currentStation.country}</p>
              </div>
              
              {/* Relojes */}
              <div className="clocks-grid">
                <div className="clock-card">
                  <p className="clock-label">Tu hora</p>
                  <p className="clock-time">
                    {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="clock-card">
                  <p className="clock-label">{currentStation.city}</p>
                  <p className="clock-time">{getLocalTime(currentStation.timezone)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Controles */}
          <div className="controls-container">
            <button onClick={togglePlay} className="play-button">
              {playing ? <Pause size={48} /> : <Play size={48} className="play-icon-offset" />}
            </button>
            
            {currentStation && (
              <button onClick={playRandomStation} className="skip-button">
                <SkipForward size={36} />
              </button>
            )}
          </div>

          {/* Botón historial */}
          <button onClick={() => setShowHistory(true)} className="history-button">
            <List size={28} />
            <span className="history-button-text">Historial ({history.length})</span>
          </button>
        </div>
      ) : (
        <div className="history-container">
          <div className="history-content">
            <div className="history-header">
              <h2 className="history-title">Canciones reproducidas</h2>
              <button onClick={() => setShowHistory(false)} className="close-button">
                <X size={32} />
              </button>
            </div>

            <div className="history-list">
              {history.length === 0 ? (
                <div className="history-empty">
                  <p className="history-empty-text">No hay canciones en el historial</p>
                  <p className="history-empty-subtext">Reproduce una radio para empezar</p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} className="history-item">
                    <p className="history-item-title">{item.title}</p>
                    <p className="history-item-artist">{item.artist}</p>
                    <div className="history-item-footer">
                      <span className="history-item-station">{item.station} · {item.city}, {item.country}</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadioApp;
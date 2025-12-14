import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, List, X, Radio } from 'lucide-react';
import './RadioApp.css';

const RadioApp = () => {
  const [stations] = useState([
    { 
      name: "KEXP", 
      country: "USA", 
      city: "Seattle", 
      timezone: "America/Los_Angeles", 
      stream: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/KEXP_logo.svg/1200px-KEXP_logo.svg.png",
      metadataUrl: "https://api.kexp.org/v2/plays/?limit=1&ordering=-airdate"
    },
    { 
      name: "FIP", 
      country: "Francia", 
      city: "París", 
      timezone: "Europe/Paris", 
      stream: "https://icecast.radiofrance.fr/fip-midfi.mp3", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/FIP_logo_2021.svg/1200px-FIP_logo_2021.svg.png",
      metadataUrl: "https://www.fip.fr/latest/api/graphql?operationName=Now&variables=%7B%22stationId%22%3A7%7D&extensions=%7B%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%228a13e023e48519ce88b0b481361d7b850c9cb78e89bca2e4ecf70f8bf1f5033f%22%7D%7D"
    },
    { 
      name: "Radio Paradise", 
      country: "USA", 
      city: "California", 
      timezone: "America/Los_Angeles", 
      stream: "https://stream.radioparadise.com/mp3-128", 
      logo: "https://img.radioparadise.com/covers/l/B000000.jpg",
      metadataUrl: "https://api.radioparadise.com/api/now_playing?chan=0"
    },
    { 
      name: "NTS Radio", 
      country: "Reino Unido", 
      city: "Londres", 
      timezone: "Europe/London", 
      stream: "https://stream-mixtape-geo.ntslive.net/mixtape", 
      logo: "https://pbs.twimg.com/profile_images/1630226075535544320/xrT89-vr_400x400.jpg",
      metadataUrl: "https://www.nts.live/api/v2/live"
    },
    { 
      name: "BBC 6 Music", 
      country: "Reino Unido", 
      city: "Londres", 
      timezone: "Europe/London", 
      stream: "https://stream.live.vc.bbcmedia.co.uk/bbc_6music", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/BBC_Radio_6_Music.svg/1200px-BBC_Radio_6_Music.svg.png",
      metadataUrl: null
    }
  ]);

  const [playing, setPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({
    title: "Selecciona una radio para comenzar",
    artist: "",
    album: "",
    cover: null
  });
  const [loading, setLoading] = useState(false);
  
  const audioRef = useRef(null);
  const metadataIntervalRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (metadataIntervalRef.current) {
        clearInterval(metadataIntervalRef.current);
      }
    };
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

  const fetchMetadata = async (station) => {
    if (!station.metadataUrl) {
      setCurrentTrack({
        title: `Escuchando ${station.name}`,
        artist: "Información no disponible",
        album: "",
        cover: null
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(station.metadataUrl);
      const data = await response.json();
      
      let trackInfo = {
        title: "Información no disponible",
        artist: "",
        album: "",
        cover: null
      };

      if (station.name === "KEXP") {
        const play = data.results?.[0];
        if (play) {
          trackInfo = {
            title: play.song || "Título desconocido",
            artist: play.artist || "",
            album: play.album || "",
            cover: play.thumbnail_uri || null
          };
        }
      } else if (station.name === "FIP") {
        const now = data.data?.live?.song;
        if (now) {
          trackInfo = {
            title: now.title || "Título desconocido",
            artist: now.interpreters?.[0] || "",
            album: now.release?.title || "",
            cover: now.cover || null
          };
        }
      } else if (station.name === "Radio Paradise") {
        if (data.title) {
          trackInfo = {
            title: data.title || "Título desconocido",
            artist: data.artist || "",
            album: data.album || "",
            cover: data.cover ? `https://img.radioparadise.com/${data.cover}` : null
          };
        }
      } else if (station.name === "NTS Radio") {
        const now = data.results?.[0]?.now;
        if (now) {
          trackInfo = {
            title: now.broadcast_title || "Título desconocido",
            artist: now.embeds?.details?.name || "",
            album: "",
            cover: now.embeds?.details?.media?.picture_large || null
          };
        }
      }

      setCurrentTrack(trackInfo);
      
      if (trackInfo.title !== "Información no disponible") {
        const historyItem = {
          ...trackInfo,
          station: station.name,
          country: station.country,
          city: station.city,
          time: new Date().toLocaleTimeString('es-ES')
        };
        setHistory(prev => {
          if (prev.length > 0 && prev[0].title === trackInfo.title && prev[0].artist === trackInfo.artist) {
            return prev;
          }
          return [historyItem, ...prev];
        });
      }
    } catch (error) {
      console.error("Error obteniendo metadata:", error);
      setCurrentTrack({
        title: `Escuchando ${station.name}`,
        artist: "No se pudo obtener información",
        album: "",
        cover: null
      });
    } finally {
      setLoading(false);
    }
  };

  const playRandomStation = () => {
    const random = stations[Math.floor(Math.random() * stations.length)];
    setCurrentStation(random);
    
    if (metadataIntervalRef.current) {
      clearInterval(metadataIntervalRef.current);
    }
    
    if (audioRef.current) {
      audioRef.current.src = random.stream;
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlaying(true);
            fetchMetadata(random);
            metadataIntervalRef.current = setInterval(() => {
              fetchMetadata(random);
            }, 30000);
          })
          .catch(err => {
            console.error("Error al reproducir:", err);
            setPlaying(false);
          });
      }
    }
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
          
          {/* Nombre de la radio arriba */}
          {currentStation && (
            <div className="station-header-top">
              <Radio size={16} />
              <span className="station-name-top">{currentStation.name}</span>
              <span className="station-location-top">
                {currentStation.city}, {currentStation.country}
              </span>
            </div>
          )}

          {/* Carátula con controles superpuestos */}
          <div className="album-cover-wrapper">
            <div 
              className="album-cover"
              onClick={togglePlay}
              style={{ cursor: currentStation ? 'pointer' : 'default' }}
            >
              {loading && (
                <div className="loading-badge">
                  Cargando...
                </div>
              )}
              {currentTrack.cover ? (
                <img 
                  src={currentTrack.cover} 
                  alt="Album" 
                  className="album-cover-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : currentStation ? (
                <img 
                  src={currentStation.logo} 
                  alt={currentStation.name} 
                  className="album-cover-logo"
                />
              ) : (
                <div className="album-cover-placeholder">🎵</div>
              )}
              
              {/* Controles superpuestos */}
              <div className="controls-overlay">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }} 
                  className="play-button-overlay"
                >
                  {playing ? <Pause size={48} /> : <Play size={48} className="play-icon" />}
                </button>
                
                {currentStation && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      playRandomStation();
                    }} 
                    className="skip-button-overlay"
                  >
                    <SkipForward size={32} />
                  </button>
                )}
              </div>
            </div>

            {/* Info canción con marquee en la parte inferior */}
            <div className="track-info-marquee">
              <div className="marquee-content">
                <span className="marquee-text">
                  {currentTrack.title}
                  {currentTrack.artist && ` • ${currentTrack.artist}`}
                  {currentTrack.album && ` • ${currentTrack.album}`}
                </span>
                <span className="marquee-text">
                  {currentTrack.title}
                  {currentTrack.artist && ` • ${currentTrack.artist}`}
                  {currentTrack.album && ` • ${currentTrack.album}`}
                </span>
              </div>
            </div>
          </div>

          {/* Relojes e historial en fila */}
          <div className="bottom-section">
            {currentStation && (
              <div className="clocks-compact">
                <div className="clock-compact">
                  <span className="clock-label-compact">Tu hora</span>
                  <span className="clock-time-compact">
                    {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="clock-compact">
                  <span className="clock-label-compact">{currentStation.city}</span>
                  <span className="clock-time-compact">{getLocalTime(currentStation.timezone)}</span>
                </div>
              </div>
            )}
            
            <button onClick={() => setShowHistory(true)} className="history-button-compact">
              <List size={20} />
              <span>{history.length}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="history-view">
          <div className="history-header">
            <h2 className="history-title">Historial</h2>
            <button onClick={() => setShowHistory(false)} className="close-button">
              <X size={28} />
            </button>
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="history-empty">
                <div className="history-empty-icon">🎵</div>
                <p className="history-empty-title">No hay canciones en el historial</p>
                <p className="history-empty-subtitle">Reproduce una radio para empezar</p>
              </div>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className="history-item">
                  <p className="history-item-title">{item.title}</p>
                  <p className="history-item-artist">{item.artist}</p>
                  <div className="history-item-footer">
                    <span className="history-item-station">
                      {item.station} · {item.city}, {item.country}
                    </span>
                    <span className="history-item-time">{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RadioApp;
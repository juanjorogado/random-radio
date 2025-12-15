import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, X } from 'lucide-react';

import './RadioApp.css';
import stations from './data/stations.json';
import AlbumCover from './components/AlbumCover';

function RadioApp() {
  const audioRef = useRef(null);
  const metadataTimer = useRef(null);
  const startingRef = useRef(false);

  const [currentStation, setCurrentStation] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [closingHistory, setClosingHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [swipeDirection, setSwipeDirection] = useState(null);

  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const swipeTimeoutRef = useRef(null);

  const [currentTrack, setCurrentTrack] = useState({
    title: 'Selecciona una radio',
    artist: '',
    album: '',
    cover: null
  });

  const [history, setHistory] = useState(() => {
    // Cargar historial desde localStorage al iniciar
    try {
      const saved = localStorage.getItem('radio-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Guardar historial en localStorage cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem('radio-history', JSON.stringify(history));
    } catch (err) {
      console.error('Error guardando historial:', err);
    }
  }, [history]);

  /* ================= TIME ================= */
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      metadataTimer.current && clearInterval(metadataTimer.current);
      retryTimeoutRef.current && clearTimeout(retryTimeoutRef.current);
      swipeTimeoutRef.current && clearTimeout(swipeTimeoutRef.current);
    };
  }, []);

  /* ================= HELPERS ================= */
  const getLocalTime = (tz) => {
    try {
      return new Date().toLocaleTimeString('es-ES', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  };

  const marqueeClass = (text, max) =>
    text && text.length > max ? 'marquee-content' : 'marquee-content short';

  // Helper para generar enlace de Apple Music
  const getAppleMusicLink = (track) => {
    if (!track.title || !track.artist) return null;
    const query = encodeURIComponent(`${track.artist} ${track.title}`);
    return `https://music.apple.com/search?term=${query}`;
  };

  /* ================= METADATA ================= */
  const fetchMetadata = async (station) => {
    if (!station?.metadataUrl) {
      setCurrentTrack({
        title: `Escuchando ${station.name}`,
        artist: '',
        album: '',
        cover: null
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(station.metadataUrl);
      const data = await res.json();

      let track = {
        title: 'Información no disponible',
        artist: '',
        album: '',
        cover: null
      };

      if (station.id === 'kexp') {
        const play = data.results?.[0];
        if (play) {
          track = {
            title: play.song || 'Sin título',
            artist: play.artist || '',
            album: play.album || '',
            cover: play.thumbnail_uri || null
          };
        }
      }

      if (station.id === 'rp' && data.title) {
        track = {
          title: data.title,
          artist: data.artist || '',
          album: data.album || '',
          cover: data.cover
            ? `https://img.radioparadise.com/${data.cover}`
            : null
        };
      }

      if (station.id === 'fip') {
        const now = data?.now;
        if (now) {
          track = {
            title: now.secondLine || now.firstLine || 'Sin título',
            artist: now.firstLine || '',
            album: '',
            cover: now.cover || null
          };
        }
      }

      if (station.id === 'nts') {
        const live = data?.results?.[0];
        if (live?.now) {
          track = {
            title:
              live.now.broadcast_title ||
              live.now.embeds?.details?.name ||
              'En vivo',
            artist: live.now.embeds?.details?.description || '',
            album: '',
            cover: live.now.embeds?.details?.media?.picture_large || null
          };
        }
      }

      setCurrentTrack(track);

      setHistory((prev) => {
        if (
          prev[0]?.title === track.title &&
          prev[0]?.artist === track.artist
        ) {
          return prev;
        }
        const newTrack = {
          ...track,
          station: station.name,
          city: station.city,
          country: station.country,
          time: new Date().toLocaleTimeString('es-ES'),
          appleMusicLink: getAppleMusicLink(track)
        };
        return [newTrack, ...prev].slice(0, 50);
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= PLAYER ================= */
  const playStation = (station, retryAttempt = 0) => {
    if (startingRef.current && retryAttempt === 0) return;
    startingRef.current = true;
    setBuffering(true);

    setCurrentStation(station);
    audioRef.current.src = station.stream;
    audioRef.current.load();

    const handlePlaySuccess = () => {
      setPlaying(true);
      setBuffering(false);
      retryCountRef.current = 0;
      fetchMetadata(station);

      metadataTimer.current &&
        clearInterval(metadataTimer.current);

        // Throttling: solo actualizar metadatos si la pestaña está visible
        metadataTimer.current = setInterval(() => {
          if (!document.hidden) {
            fetchMetadata(station);
          }
        }, 30000);
      startingRef.current = false;
    };

    const handlePlayError = () => {
      setPlaying(false);
      setBuffering(false);
      startingRef.current = false;

      // Reintento suave automático (máximo 3 intentos)
      if (retryAttempt < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000);
        retryTimeoutRef.current = setTimeout(() => {
          playStation(station, retryAttempt + 1);
        }, delay);
      } else {
        retryCountRef.current = 0;
      }
    };

    audioRef.current
      .play()
      .then(handlePlaySuccess)
      .catch(handlePlayError);

    // Detectar buffering
    audioRef.current.addEventListener('waiting', () => setBuffering(true));
    audioRef.current.addEventListener('playing', () => setBuffering(false));
    audioRef.current.addEventListener('canplay', () => setBuffering(false));
  };

  const playRandomStation = () => {
    const random =
      stations[Math.floor(Math.random() * stations.length)];
    playStation(random);
  };

  const togglePlay = () => {
    if (!currentStation) return playRandomStation();
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        // Si falla, intentar reconectar
        if (currentStation) playStation(currentStation);
      });
      setPlaying(true);
    }
  };

  // Gestos: doble tap en carátula
  const coverRef = useRef(null);
  const lastTapRef = useRef(0);

  const handleCoverDoubleTap = (e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      togglePlay();
    }
    lastTapRef.current = now;
  };

  // Gestos: swipe lateral
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndRef.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swipe izquierda: animar salida hacia la izquierda y cambiar emisora
        setSwipeDirection('left');
        swipeTimeoutRef.current = setTimeout(() => {
          playRandomStation();
          setSwipeDirection(null);
        }, 280);
      } else {
        // Swipe derecha: animar salida hacia la derecha y cambiar emisora
        setSwipeDirection('right');
        swipeTimeoutRef.current = setTimeout(() => {
          playRandomStation();
          setSwipeDirection(null);
        }, 280);
      }
    }
    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  // Teclado: espacio para play/pause
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= UI ================= */
  return (
    <div className="radio-app">
      <audio ref={audioRef} crossOrigin="anonymous" />

      {!showHistory ? (
        <div className="main-container">
          <div className="station-header-top">
            {currentStation ? (
              <span className="station-header-content">
                {playing && (
                  <span className="station-live-indicator">
                    <span className="wave-indicator" />
                  </span>
                )}
                <span>
                  {currentStation.name} — {currentStation.city}
                </span>
              </span>
            ) : (
              'Selecciona una radio'
            )}
          </div>

          <div className="clocks-horizontal">
            <div className="clock-item">
              <div className="clock-label-top">Hora local</div>
              <div className="clock-time-large">
                {currentTime.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div className="clock-item">
              <div className="clock-label-top">
                {currentStation ? currentStation.city : 'Ciudad'}
              </div>
              <div className="clock-time-large">
                {currentStation
                  ? getLocalTime(currentStation.timezone)
                  : '--:--'}
              </div>
            </div>
          </div>

          {/* COVER + CONTROLES CENTRADOS SOBRE LA CARÁTULA */}
          <div
            className={`cover-with-controls ${
              swipeDirection === 'left'
                ? 'cover-swipe-left'
                : swipeDirection === 'right'
                ? 'cover-swipe-right'
                : ''
            }`}
            ref={coverRef}
            onDoubleClick={handleCoverDoubleTap}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AlbumCover
              src={currentTrack.cover || currentStation?.logo}
              stationId={currentStation?.id}
              stationName={currentStation?.name}
            />
            {buffering && (
              <div className="buffering-indicator" aria-label="Cargando">
                <div className="buffering-spinner" />
              </div>
            )}

            <div className="controls-overlay">
              <button
                onClick={togglePlay}
                className="play-button-overlay"
                aria-label={playing ? 'Pausar' : 'Reproducir'}
              >
                {playing ? <Pause size={48} /> : <Play size={48} />}
              </button>
              {currentStation && (
                <button
                  onClick={playRandomStation}
                  className="skip-button-overlay"
                  aria-label="Siguiente emisora"
                >
                  <SkipForward size={32} />
                </button>
              )}
            </div>
          </div>

          {/* TRACK INFO / MARQUEE */}
          <div className="track-info-section">
            <div className="marquee-container">
              <div
                className={marqueeClass(currentTrack.title, 30)}
              >
                {/* Marquee: texto duplicado como hermanos para scroll continuo */}
                <span className="marquee-text song-title">
                  {currentTrack.title}
                </span>
                {currentTrack.title.length > 30 && (
                  <span
                    className="marquee-text song-title"
                    aria-hidden="true"
                  >
                    {currentTrack.title}
                  </span>
                )}
              </div>
            </div>
            <div className="song-metadata">
              {currentTrack.artist}{' '}
              {currentTrack.album && `- ${currentTrack.album}`}
            </div>
          </div>

          <button
            className="history-btn"
            onClick={() => {
              setClosingHistory(false);
              setShowHistory(true);
            }}
          >
            Ver historial <span>{history.length}</span>
          </button>
        </div>
      ) : (
        /* HISTORY VIEW */
        <div
          className={`history-view ${
            closingHistory ? 'history-view-closing' : ''
          }`}
        >
          <div className="history-header">
            <h2>Historial de Reproducción</h2>
            <button
              onClick={() => {
                setClosingHistory(true);
                setTimeout(() => {
                  setShowHistory(false);
                  setClosingHistory(false);
                }, 500);
              }}
            >
              <X size={28} />
            </button>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <p className="history-empty">
                Aún no hay canciones en el historial.
              </p>
            ) : (
              history.map((track, index) => (
                <div key={index} className="history-item">
                  <div className="history-info">
                    <div className="history-title">
                      {track.appleMusicLink ? (
                        <a
                          href={track.appleMusicLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="history-link"
                          aria-label={`Abrir ${track.title} en Apple Music`}
                        >
                          {track.title}
                        </a>
                      ) : (
                        track.title
                      )}
                    </div>
                    <div className="history-meta">
                      {track.artist} - {track.station}
                    </div>
                  </div>
                  <div className="history-time">{track.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RadioApp;
import React, { useState, useEffect, useRef } from 'react';

import './RadioApp.css';
import stations from './data/stations.json';
import AlbumCover from './components/AlbumCover';

function RadioApp() {
  const audioRef = useRef(null);
  const metadataTimer = useRef(null);
  const startingRef = useRef(false);

  const [currentStation, setCurrentStation] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [swipeDirection, setSwipeDirection] = useState(null);

  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const swipeTimeoutRef = useRef(null);
  const swipeLockRef = useRef(false);
  
  // Refs para swipe vertical del drawer
  const drawerTouchStartYRef = useRef(null);
  const drawerTouchStartXRef = useRef(null);

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
      tapTimeoutRef.current && clearTimeout(tapTimeoutRef.current);
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
        // Verificar si la canción ya existe en el historial (no solo la primera)
        const isDuplicate = prev.some(
          (item) => item.title === track.title && item.artist === track.artist
        );
        
        if (isDuplicate) {
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

  // Gestos: doble tap en carátula (funciona en móvil y desktop)
  const coverRef = useRef(null);
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  const isSwipeRef = useRef(false);

  const handleCoverTap = (e) => {
    // Si fue un swipe, ignorar el tap
    if (isSwipeRef.current) {
      isSwipeRef.current = false;
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Es un doble tap
      e.preventDefault();
      e.stopPropagation();
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      togglePlay();
      lastTapRef.current = 0;
    } else {
      // Primer tap, esperar para ver si hay segundo
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleCoverDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePlay();
  };

  // Gestos: swipe lateral
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const touchStartYRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    // Prevenir scroll vertical si hay movimiento horizontal
    if (touchStartRef.current !== null) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartYRef.current);
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartRef.current === null) return;
    touchEndRef.current = e.changedTouches[0].clientX;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
    const deltaX = Math.abs(touchEndRef.current - touchStartRef.current);
    
    // Guardar valores antes de limpiar
    const startX = touchStartRef.current;
    const endX = touchEndRef.current;
    
    // Solo procesar swipe si el movimiento horizontal es mayor que el vertical y suficiente
    if (deltaX > deltaY && deltaX > 30) {
      isSwipeRef.current = true;
      // Pasar los valores directamente
      const distance = startX - endX;
      const minSwipeDistance = 50;

      if (Math.abs(distance) > minSwipeDistance) {
        if (distance > 0) {
          // Swipe de derecha a izquierda: carátula sale a la izquierda, nueva entra desde la derecha
          startSwipe('left');
        } else {
          // Swipe de izquierda a derecha: carátula sale a la derecha, nueva entra desde la izquierda
          startSwipe('right');
        }
      }
    } else {
      // Si es más vertical o movimiento pequeño, tratar como tap
      handleCoverTap(e);
    }
    
    touchStartRef.current = null;
    touchEndRef.current = null;
    touchStartYRef.current = null;
  };

  const startSwipe = (direction) => {
    if (swipeLockRef.current) return;
    swipeLockRef.current = true;

    // Determinar clases según dirección del swipe
    // Si swipe es de derecha a izquierda (distance > 0), la carátula sale a la izquierda
    // y la nueva entra desde la derecha
    const outClass =
      direction === 'left'
        ? 'cover-swipe-out-left'
        : 'cover-swipe-out-right';
    const inClass =
      direction === 'left'
        ? 'cover-swipe-in-right'
        : 'cover-swipe-in-left';

    // Fase 1: Salida de la carátula actual
    setSwipeDirection(outClass);

    // Fase 2: Cambiar emisora y preparar entrada desde el lado opuesto
    swipeTimeoutRef.current = setTimeout(() => {
      playRandomStation();
      // Aplicar clase de entrada inmediatamente después del cambio
      setSwipeDirection(inClass);

      // Fase 3: Transición a centro (estado neutro) después de que la entrada termine
      swipeTimeoutRef.current = setTimeout(() => {
        setSwipeDirection(null);

        // Desbloquear después de que termine la animación completa
        swipeTimeoutRef.current = setTimeout(() => {
          swipeLockRef.current = false;
        }, 100);
      }, 300);
    }, 300);
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

      <div className="main-container">
          <div className="station-header-top">
            {currentStation ? (
              <span className="station-header-content">
                <span className="station-live-indicator">
                  <span className={`wave-indicator ${playing ? 'wave-playing' : ''}`} />
                </span>
                <span>
                  {currentStation.name} — {currentStation.city}
                </span>
              </span>
            ) : (
              <span className="station-header-content">
                <span className="station-live-indicator">
                  <span className="wave-indicator" />
                </span>
                <span>Selecciona una radio</span>
              </span>
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

          {/* COVER + GESTOS (doble tap y swipe) */}
          <div
            className={`cover-with-controls ${
              swipeDirection ? swipeDirection : ''
            } ${playing ? 'cover-playing' : ''}`}
            ref={coverRef}
            onClick={handleCoverTap}
            onDoubleClick={handleCoverDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
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
          </div>

          {/* TRACK INFO / MARQUEE */}
          <div className="track-info-section">
            <div className="marquee-container">
              <div className="marquee-content">
                {/* Marquee: siempre se mueve, texto duplicado */}
                <span className="marquee-text song-title">
                  {currentTrack.title}
                </span>
                <span
                  className="marquee-text song-title"
                  aria-hidden="true"
                >
                  {currentTrack.title}
                </span>
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
              setHistoryOpen(true);
            }}
          >
            Historial — ({history.length.toLocaleString('es-ES')})
          </button>
        </div>

      {/* HISTORY DRAWER - Siempre visible, parcialmente cuando está cerrado */}
      <div
        className={`history-view ${historyOpen ? 'history-view-open' : 'history-view-closed'}`}
        onTouchStart={(e) => {
          drawerTouchStartYRef.current = e.touches[0].clientY;
          drawerTouchStartXRef.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          // Permitir scroll dentro del drawer cuando está abierto, pero detectar swipe en el header
          if (drawerTouchStartYRef.current !== null && historyOpen) {
            const deltaY = e.touches[0].clientY - drawerTouchStartYRef.current;
            const deltaX = Math.abs(e.touches[0].clientX - drawerTouchStartXRef.current);
            // Si el swipe es principalmente vertical y hacia abajo, y estamos cerca del top
            if (deltaY > 0 && Math.abs(deltaY) > deltaX && e.touches[0].clientY < 100) {
              e.preventDefault();
            }
          }
        }}
        onTouchEnd={(e) => {
          if (drawerTouchStartYRef.current === null) return;
          const endY = e.changedTouches[0].clientY;
          const endX = e.changedTouches[0].clientX;
          const deltaY = endY - drawerTouchStartYRef.current;
          const deltaX = Math.abs(endX - drawerTouchStartXRef.current);
          const minSwipeDistance = 50;
          
          // Solo procesar si el movimiento es principalmente vertical
          if (Math.abs(deltaY) > deltaX && Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY < 0 && !historyOpen) {
              // Swipe hacia arriba cuando está cerrado: abrir drawer
              setHistoryOpen(true);
            } else if (deltaY > 0 && historyOpen) {
              // Swipe hacia abajo cuando está abierto: cerrar drawer
              setHistoryOpen(false);
            }
          }
          
          drawerTouchStartYRef.current = null;
          drawerTouchStartXRef.current = null;
        }}
      >
        <div className="history-header">
          <h2>Historial de Reproducción</h2>
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
    </div>
  );
}

export default RadioApp;
import React, { useState, useEffect, useRef, useCallback } from 'react';

import './RadioApp.css';
import stations from './data/stations.json';
import AlbumCover from './components/AlbumCover';

function RadioApp() {
  const audioRef = useRef(null);
  const metadataTimer = useRef(null);
  const startingRef = useRef(false);
  
  // Refs para los handlers de buffering (necesarios para poder eliminarlos)
  const waitingHandlerRef = useRef(null);
  const playingHandlerRef = useRef(null);
  const canplayHandlerRef = useRef(null);

  const [currentStation, setCurrentStation] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [swipeDirection, setSwipeDirection] = useState(null);

  const retryTimeoutRef = useRef(null);
  const swipeTimeoutRef = useRef(null);
  const swipeLockRef = useRef(false);
  
  // Refs para swipe vertical del drawer
  const drawerTouchStartYRef = useRef(null);
  const drawerTouchStartXRef = useRef(null);
  
  // Refs para gestos: doble tap en carátula (funciona en móvil y desktop)
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  const isSwipeRef = useRef(false);

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
    // Crear handlers una sola vez
    waitingHandlerRef.current = () => setBuffering(true);
    playingHandlerRef.current = () => setBuffering(false);
    canplayHandlerRef.current = () => setBuffering(false);
    
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('waiting', waitingHandlerRef.current);
      audio.addEventListener('playing', playingHandlerRef.current);
      audio.addEventListener('canplay', canplayHandlerRef.current);
    }
    
    return () => {
      metadataTimer.current && clearInterval(metadataTimer.current);
      retryTimeoutRef.current && clearTimeout(retryTimeoutRef.current);
      swipeTimeoutRef.current && clearTimeout(swipeTimeoutRef.current);
      tapTimeoutRef.current && clearTimeout(tapTimeoutRef.current);
      
      // Limpiar event listeners del audio
      if (audio && waitingHandlerRef.current && playingHandlerRef.current && canplayHandlerRef.current) {
        audio.removeEventListener('waiting', waitingHandlerRef.current);
        audio.removeEventListener('playing', playingHandlerRef.current);
        audio.removeEventListener('canplay', canplayHandlerRef.current);
      }
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
      // Timeout para evitar que la petición se quede colgada
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

      const res = await fetch(station.metadataUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      // Verificar si la respuesta es exitosa
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status} ${res.statusText} - ${station.name}`);
      }

      // Verificar que el contenido sea JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Respuesta no es JSON - ${station.name}`);
      }

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
      // Manejo específico de diferentes tipos de errores
      if (err.name === 'AbortError') {
        console.error(`[${station.name}] Timeout al obtener metadatos: la petición tardó más de 10 segundos`);
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        console.error(`[${station.name}] Error de red: no se pudo conectar con la API de metadatos`, err.message);
      } else if (err instanceof SyntaxError) {
        console.error(`[${station.name}] Error al parsear JSON: respuesta inválida de la API`, err.message);
      } else {
        console.error(`[${station.name}] Error al obtener metadatos:`, err.message || err);
      }
      
      // Mantener el track actual o mostrar un mensaje genérico
      setCurrentTrack({
        title: `Escuchando ${station.name}`,
        artist: '',
        album: '',
        cover: null
      });
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
      }
    };

    audioRef.current
      .play()
      .then(handlePlaySuccess)
      .catch(handlePlayError);

    // Los event listeners de buffering se añaden una sola vez en useEffect
    // No es necesario añadirlos aquí cada vez
  };

  const playRandomStation = useCallback(() => {
    const random =
      stations[Math.floor(Math.random() * stations.length)];
    playStation(random);
  }, []);

  const togglePlay = useCallback(() => {
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
  }, [currentStation, playing, playRandomStation]);

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
  }, [togglePlay]);

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
                <div className="buffering-spinner">
                  <svg width="277" height="277" viewBox="0 0 277 277" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M117.724 81.974H204.107V93.9479H117.724V81.974ZM118.067 124.054H193.673V135.685H118.067V124.054ZM152.62 57H165.107V130.211H152.62V57ZM111.053 81.974H123.369V125.251C123.369 131.979 123.084 139.22 122.514 146.975C122.058 154.615 121.032 162.427 119.435 170.409C117.953 178.392 115.729 186.203 112.764 193.844C109.913 201.37 106.036 208.213 101.132 214.37C100.448 213.686 99.4216 212.888 98.0532 211.976C96.7988 211.177 95.4874 210.379 94.1189 209.581C92.7505 208.897 91.5531 208.384 90.5268 208.041C95.2023 201.998 98.9085 195.497 101.645 188.541C104.382 181.471 106.435 174.287 107.803 166.988C109.172 159.576 110.027 152.335 110.369 145.264C110.825 138.08 111.053 131.352 111.053 125.08V81.974ZM200.686 81.974H202.739L204.962 81.4608L214.199 83.8556C212.033 90.0136 209.638 96.2856 207.015 102.672C204.506 108.944 202.055 114.303 199.66 118.751L188.541 115.159C190.594 111.167 192.704 106.321 194.87 100.619C197.151 94.8031 199.09 89.2724 200.686 84.0267V81.974ZM138.08 130.896C142.185 142.641 147.83 153.418 155.014 163.225C162.313 172.918 171.037 181.243 181.186 188.199C191.449 195.041 203.024 200.173 215.91 203.594C214.998 204.392 213.971 205.419 212.831 206.673C211.805 208.041 210.778 209.41 209.752 210.778C208.84 212.147 208.098 213.401 207.528 214.542C187.572 208.384 170.923 198.348 157.58 184.436C144.238 170.523 134.089 153.76 127.133 134.146L138.08 130.896ZM66.237 67.9475L73.5923 58.8816C77.0134 60.4781 80.6056 62.3597 84.3688 64.5264C88.132 66.6931 91.6671 68.9168 94.9742 71.1976C98.3953 73.3643 101.189 75.4169 103.356 77.3555L95.8295 87.6188C93.6628 85.6802 90.9259 83.5705 87.6188 81.2898C84.3118 78.895 80.7766 76.5573 77.0134 74.2765C73.2502 71.8818 69.6581 69.7721 66.237 67.9475ZM57 114.303L64.1843 104.724C67.6054 106.321 71.2546 108.145 75.1318 110.198C79.0091 112.137 82.6582 114.189 86.0793 116.356C89.5004 118.409 92.3513 120.347 94.6321 122.172L87.2767 132.777C85.11 130.839 82.3161 128.786 78.895 126.619C75.4739 124.339 71.8248 122.115 67.9475 119.948C64.0703 117.782 60.4211 115.9 57 114.303ZM61.1053 204.449C63.8422 200.002 66.8071 194.756 70.0002 188.712C73.3072 182.554 76.6143 176.054 79.9214 169.212C83.2284 162.37 86.3074 155.756 89.1583 149.37L99.2506 157.067C96.7418 162.997 93.9479 169.212 90.8689 175.712C87.7899 182.212 84.6539 188.598 81.4608 194.87C78.3819 201.142 75.3599 206.958 72.3949 212.318L61.1053 204.449ZM188.883 124.054H191.62L194.015 123.711L202.055 127.304C197.835 143.041 191.734 156.668 183.752 168.186C175.883 179.589 166.646 189.111 156.041 196.752C145.435 204.392 134.032 210.436 121.83 214.884C121.26 213.857 120.461 212.66 119.435 211.292C118.523 209.923 117.553 208.555 116.527 207.186C115.501 205.932 114.474 204.962 113.448 204.278C125.422 200.287 136.426 194.87 146.462 188.028C156.611 181.186 165.335 172.69 172.633 162.541C180.045 152.392 185.462 140.418 188.883 126.619V124.054Z" />
                  </svg>
                </div>
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
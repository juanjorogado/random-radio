import React, { useState, useEffect, useRef, useCallback } from 'react';

import './RadioApp.css';
import stations from './data/stations.json';
import AlbumCover from './components/AlbumCover';
import HistoryDrawer from './components/HistoryDrawer';
import StationHeader from './components/StationHeader';
import Clocks from './components/Clocks';
import { useDebounce } from './hooks/useDebounce';

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
  const retryTimeoutRef = useRef(null);
  
  // Refs para swipe vertical del drawer
  const drawerTouchStartYRef = useRef(null);
  const drawerTouchStartXRef = useRef(null);
  
  // Refs para gestos: doble tap en carátula (funciona en móvil y desktop)
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);

  const [currentTrack, setCurrentTrack] = useState({
    title: 'Selecciona una radio',
    artist: '',
    album: '',
    year: null,
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

  // Guardar historial en localStorage con debounce (500ms)
  useDebounce(() => {
    try {
      localStorage.setItem('radio-history', JSON.stringify(history));
    } catch (err) {
      console.error('Error guardando historial:', err);
    }
  }, 500, [history]);

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

  // Helper para formatear información de la canción en una sola línea
  const formatTrackInfo = (track) => {
    const parts = [];
    
    if (track.title) {
      parts.push(track.title);
    }
    
    if (track.artist) {
      parts.push(track.artist);
    }
    
    if (track.album) {
      const albumPart = track.album;
      if (track.year) {
        parts.push(`${albumPart} (${track.year})`);
      } else {
        parts.push(albumPart);
      }
    } else if (track.year) {
      // Si hay año pero no álbum, mostrarlo al final
      parts.push(`(${track.year})`);
    }
    
    return parts.join(' — ');
  };

  /* ================= METADATA ================= */
  const fetchMetadata = async (station) => {
    if (!station?.metadataUrl) {
      setCurrentTrack({
        title: `Escuchando ${station.name}`,
        artist: '',
        album: '',
        year: null,
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
        year: null,
        cover: null
      };

      if (station.id === 'kexp') {
        const play = data.results?.[0];
        if (play) {
          track = {
            title: play.song || 'Sin título',
            artist: play.artist || '',
            album: play.album || '',
            year: play.release_date ? new Date(play.release_date).getFullYear() : null,
            cover: play.thumbnail_uri || null
          };
        }
      }

      if (station.id === 'rp' && data.title) {
        track = {
          title: data.title,
          artist: data.artist || '',
          album: data.album || '',
          year: data.year || null,
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
            year: null,
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
            year: null,
            cover: live.now.embeds?.details?.media?.picture_large || null
          };
        }
      }

      setCurrentTrack(track);

      // Solo agregar al historial si hay información válida de título y artista
      const hasValidInfo = track.title && 
                          track.artist && 
                          track.title !== 'Información no disponible' &&
                          track.title !== 'Sin título' &&
                          track.title !== 'En vivo' &&
                          !track.title.startsWith('Escuchando');

      if (hasValidInfo) {
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
      }
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
        year: null,
        cover: null
      });
    }
  };

  /* ================= PLAYER ================= */
  const playStation = (station, retryAttempt = 0, triedStations = new Set()) => {
    if (startingRef.current && retryAttempt === 0) return;
    startingRef.current = true;
    setBuffering(true);

    // Agregar esta estación a las intentadas
    triedStations.add(station.id);
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
          playStation(station, retryAttempt + 1, triedStations);
        }, delay);
      } else {
        // Si se agotaron los reintentos, intentar con la siguiente estación
        const availableStations = stations.filter(s => !triedStations.has(s.id));
        
        if (availableStations.length > 0) {
          // Intentar con una estación aleatoria de las disponibles
          const nextStation = availableStations[Math.floor(Math.random() * availableStations.length)];
          const delay = 1000; // Pequeño delay antes de intentar la siguiente
          retryTimeoutRef.current = setTimeout(() => {
            playStation(nextStation, 0, triedStations);
          }, delay);
        } else {
          // Si se intentaron todas las estaciones, mostrar mensaje de error
          console.warn('Todas las estaciones fallaron al cargar');
          setCurrentTrack({
            title: 'No se pudo conectar a ninguna estación',
            artist: '',
            album: '',
            year: null,
            cover: null
          });
        }
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
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Es un doble tap - cambiar de emisora
      e.preventDefault();
      e.stopPropagation();
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      playRandomStation();
      lastTapRef.current = 0;
    } else {
      // Primer tap, esperar para ver si hay segundo
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        // Si pasó el tiempo sin segundo tap, es un tap simple - pausar/play
        if (lastTapRef.current === now) {
          togglePlay();
        }
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
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
          <StationHeader currentStation={currentStation} playing={playing} />
          <Clocks 
            currentStation={currentStation} 
            currentTime={currentTime} 
            getLocalTime={getLocalTime} 
          />

          {/* COVER + GESTOS (tap para play/pause, doble tap para cambiar emisora) */}
          <div
            className={`cover-with-controls ${playing ? 'cover-playing' : ''}`}
            onClick={handleCoverTap}
          >
            <AlbumCover
              src={currentTrack.cover || currentStation?.logo}
              stationId={currentStation?.id}
              stationName={currentStation?.name}
              city={currentStation?.city}
              country={currentStation?.country}
            />
            {!playing && !buffering && (
              <div className="tap-indicator" aria-label="Tap para reproducir">
                <div className="tap-indicator-circle"></div>
              </div>
            )}
            {buffering && (
              <div className="buffering-indicator" aria-label="Cargando">
                <div className="buffering-spinner">
                  <div className="wave-spinner">
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                    <div className="wave-bar"></div>
                  </div>
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
                  {formatTrackInfo(currentTrack)}
                </span>
                <span
                  className="marquee-text song-title"
                  aria-hidden="true"
                >
                  {formatTrackInfo(currentTrack)}
                </span>
              </div>
            </div>
          </div>
        </div>

      {/* HISTORY DRAWER - Siempre visible, parcialmente cuando está cerrado */}
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
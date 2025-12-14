import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, X, Radio } from 'lucide-react';
import './RadioApp.css';
import { useState, useEffect } from 'react';

import stations from './data/stations.json';
import AlbumCover from './components/AlbumCover';

<AlbumCover
  src={currentTrack.cover || currentStation?.logo}
/>


export function useImageStatus(src) {
  const [status, setStatus] = useState('idle'); // idle | loading | loaded | error

  useEffect(() => {
    if (!src) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    const img = new Image();

    img.onload = () => setStatus('loaded');
    img.onerror = () => setStatus('error');
    img.src = src;
  }, [src]);

  return status;
}

import stations from './stations.json';

function RadioApp() {
  const audioRef = useRef(null);
  const metadataTimer = useRef(null);
  const startingRef = useRef(false);

  const [currentStation, setCurrentStation] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [currentTrack, setCurrentTrack] = useState({
    title: 'Selecciona una radio',
    artist: '',
    album: '',
    cover: null
  });

  const [history, setHistory] = useState([]);

  /* ================= TIME ================= */
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => metadataTimer.current && clearInterval(metadataTimer.current);
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

  /* ================= METADATA ================= */
  const fetchMetadata = async (station) => {
    if (!station.metadataUrl) {
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
      console.log('Fetching metadata for:', station.name);
      const res = await fetch(station.metadataUrl);
      const data = await res.json();
      console.log('Metadata received:', data);

      let track = {
        title: 'Información no disponible',
        artist: '',
        album: '',
        cover: null
      };

      // KEXP
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

      // Radio Paradise
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

      // FIP
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

      // NTS
      if (station.id === 'nts') {
        const live = data?.results?.[0];
        if (live && live.now) {
          track = {
            title: live.now.broadcast_title || live.now.embeds?.details?.name || 'En vivo',
            artist: live.now.embeds?.details?.description || '',
            album: '',
            cover: live.now.embeds?.details?.media?.picture_large || null
          };
        }
      }

      console.log('Track parsed:', track);
      setCurrentTrack(track);

      // Add to history if it's a new track
      setHistory((prev) => {
        if (prev[0]?.title === track.title && prev[0]?.artist === track.artist) {
          return prev;
        }
        return [
          {
            ...track,
            station: station.name,
            city: station.city,
            country: station.country,
            time: new Date().toLocaleTimeString('es-ES')
          },
          ...prev
        ].slice(0, 50); // Limit to 50 items
      });
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setCurrentTrack({
        title: `Escuchando ${station.name}`,
        artist: '',
        album: '',
        cover: null
      });
    } finally {
      setLoading(false);
    }
  };

  /* ================= PLAYER ================= */
  const playStation = (station) => {
    if (startingRef.current) return;
    startingRef.current = true;

    setCurrentStation(station);
    audioRef.current.src = station.stream;
    audioRef.current.load();

    audioRef.current
      .play()
      .then(() => {
        setPlaying(true);
        fetchMetadata(station);
        
        // Clear any existing interval
        if (metadataTimer.current) {
          clearInterval(metadataTimer.current);
        }
        
        // Fetch metadata every 30 seconds
        metadataTimer.current = setInterval(
          () => fetchMetadata(station),
          30000
        );
      })
      .catch((error) => {
        console.error('Error playing audio:', error);
        setPlaying(false);
      })
      .finally(() => {
        startingRef.current = false;
      });
  };

  const playRandomStation = () => {
    const random = stations[Math.floor(Math.random() * stations.length)];
    playStation(random);
  };

  const togglePlay = () => {
    if (!currentStation) return playRandomStation();
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="radio-app">
      <audio ref={audioRef} crossOrigin="anonymous" />

      {!showHistory ? (
        <div className="main-container">
          {/* HEADER */}
          <div className="station-header-top">
            {currentStation ? (
              <span className="station-playing">
                {playing && (
                  <span className="playing-indicator">
                    <span />
                  </span>
                )}
                {currentStation.name} — {currentStation.city}
              </span>
            ) : (
              'Selecciona una radio'
            )}
          </div>

          {/* CLOCKS */}
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

          {/* COVER 1:1 */}
          <div className="album-cover-main">
            {loading && <div className="loading-badge">Cargando</div>}

            {currentTrack.cover ? (
              <img
                src={currentTrack.cover}
                alt=""
                className="album-cover-image"
              />
            ) : currentStation ? (
              <img
                src={currentStation.logo}
                alt=""
                className="album-cover-logo"
              />
            ) : (
              <Radio size={80} opacity={0.2} />
            )}

            <div className="controls-overlay">
              <button className="play-button-overlay" onClick={togglePlay}>
                {playing ? <Pause size={48} /> : <Play size={48} />}
              </button>
              {currentStation && (
                <button
                  className="skip-button-overlay"
                  onClick={playRandomStation}
                >
                  <SkipForward size={32} />
                </button>
              )}
            </div>
          </div>

          {/* MARQUEE */}
          <div className="track-info-section">
            <div className="marquee-container">
              <div className={marqueeClass(currentTrack.title, 40)}>
                <span className="marquee-text">
                  <h1 className="song-title">{currentTrack.title}</h1>
                </span>
                <span className="marquee-text">
                  <h1 className="song-title">{currentTrack.title}</h1>
                </span>
              </div>
            </div>

            <div className="marquee-container">
              <div
                className={marqueeClass(
                  currentTrack.artist + currentTrack.album,
                  50
                )}
              >
                <span className="marquee-text">
                  <p className="song-metadata">
                    {currentTrack.artist}
                    {currentTrack.album && ` — ${currentTrack.album}`}
                  </p>
                </span>
                <span className="marquee-text">
                  <p className="song-metadata">
                    {currentTrack.artist}
                    {currentTrack.album && ` — ${currentTrack.album}`}
                  </p>
                </span>
              </div>
            </div>
          </div>

          {/* HISTORY BUTTON */}
          <button
            className="history-btn"
            onClick={() => setShowHistory(true)}
          >
            Ver historial
            <span className="history-count">{history.length}</span>
          </button>
        </div>
      ) : (
        /* HISTORY VIEW */
        <div className="history-view">
          <div className="history-header">
            <h2 className="history-title">Historial</h2>
            <button
              className="close-button"
              onClick={() => setShowHistory(false)}
            >
              <X size={28} />
            </button>
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="history-empty">
                <div className="history-empty-icon">🎵</div>
                <p className="history-empty-title">
                  No hay canciones en el historial
                </p>
                <p className="history-empty-subtitle">
                  Reproduce una radio para empezar
                </p>
              </div>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className="history-item">
                  <p className="history-item-title">{item.title}</p>
                  <p className="history-item-artist">{item.artist}</p>
                  <div className="history-item-footer">
                    <span>
                      {item.station} · {item.city}, {item.country}
                    </span>
                    <span>{item.time}</span>
                  </div>
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
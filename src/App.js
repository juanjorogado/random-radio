import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, X, Radio } from 'lucide-react';
import './RadioApp.css';

const stations = [
  {
    id: 'kexp',
    name: 'KEXP',
    country: 'USA',
    city: 'Seattle',
    timezone: 'America/Los_Angeles',
    stream: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/42/KEXP_logo.svg',
    metadataUrl: 'https://api.kexp.org/v2/plays/?limit=1&ordering=-airdate'
  },
  {
    id: 'fip',
    name: 'FIP',
    country: 'Francia',
    city: 'París',
    timezone: 'Europe/Paris',
    stream: 'https://icecast.radiofrance.fr/fip-midfi.mp3',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/09/FIP_logo_2021.svg',
    metadataUrl: null
  },
  {
    id: 'rp',
    name: 'Radio Paradise',
    country: 'USA',
    city: 'California',
    timezone: 'America/Los_Angeles',
    stream: 'https://stream.radioparadise.com/mp3-128',
    logo: 'https://img.radioparadise.com/covers/l/B000000.jpg',
    metadataUrl: 'https://api.radioparadise.com/api/now_playing?chan=0'
  },
  {
    id: 'nts',
    name: 'NTS Radio',
    country: 'Reino Unido',
    city: 'Londres',
    timezone: 'Europe/London',
    stream: 'https://stream-mixtape-geo.ntslive.net/mixtape',
    logo: 'https://pbs.twimg.com/profile_images/1630226075535544320/xrT89-vr_400x400.jpg',
    metadataUrl: 'https://www.nts.live/api/v2/live'
  }
];

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
            title: play.song,
            artist: play.artist,
            album: play.album,
            cover: play.thumbnail_uri
          };
        }
      }

      if (station.id === 'rp' && data.title) {
        track = {
          title: data.title,
          artist: data.artist,
          album: data.album,
          cover: data.cover
            ? `https://img.radioparadise.com/${data.cover}`
            : null
        };
      }

      setCurrentTrack(track);

      setHistory((prev) => {
        if (prev[0]?.title === track.title) return prev;
        return [
          {
            ...track,
            station: station.name,
            city: station.city,
            country: station.country,
            time: new Date().toLocaleTimeString('es-ES')
          },
          ...prev
        ];
      });
    } catch {
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
        metadataTimer.current = setInterval(
          () => fetchMetadata(station),
          30000
        );
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

export default RadioApp
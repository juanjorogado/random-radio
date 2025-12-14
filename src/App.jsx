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
        return [
          {
            ...track,
            station: station.name,
            city: station.city,
            country: station.country,
            time: new Date().toLocaleTimeString('es-ES')
          },
          ...prev
        ].slice(0, 50);
      });
    } catch (err) {
      console.error(err);
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

        metadataTimer.current &&
          clearInterval(metadataTimer.current);

        metadataTimer.current = setInterval(
          () => fetchMetadata(station),
          30000
        );
      })
      .catch(() => setPlaying(false))
      .finally(() => (startingRef.current = false));
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
          <div className="station-header-top">
            {currentStation
              ? `${currentStation.name} — ${currentStation.city}`
              : 'Selecciona una radio'}
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

          {/* COVER */}
          <AlbumCover
            src={currentTrack.cover || currentStation?.logo}
          />

          <div className="controls-overlay">
            <button onClick={togglePlay}>
              {playing ? <Pause size={48} /> : <Play size={48} />}
            </button>
            {currentStation && (
              <button onClick={playRandomStation}>
                <SkipForward size={32} />
              </button>
            )}
          </div>

          <button
            className="history-btn"
            onClick={() => setShowHistory(true)}
          >
            Ver historial <span>{history.length}</span>
          </button>
        </div>
      ) : (
        <div className="history-view">
          <button onClick={() => setShowHistory(false)}>
            <X size={28} />
          </button>
        </div>
      )}
    </div>
  );
}

export default RadioApp;

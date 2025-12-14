import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, X, Radio } from 'lucide-react';
import './RadioApp.css';

const RadioApp = () => {
  const stations = [
    { 
      id: 'kexp',
      name: "KEXP", 
      country: "USA", 
      city: "Seattle", 
      timezone: "America/Los_Angeles", 
      stream: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/KEXP_logo.svg/1200px-KEXP_logo.svg.png",
      metadataUrl: "https://api.kexp.org/v2/plays/?limit=1&ordering=-airdate"
    },
    { 
      id: 'fip',
      name: "FIP", 
      country: "Francia", 
      city: "París", 
      timezone: "Europe/Paris", 
      stream: "https://icecast.radiofrance.fr/fip-midfi.mp3", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/FIP_logo_2021.svg/1200px-BBC_Radio_6_Music.svg.png",
      metadataUrl: "https://www.fip.fr/latest/api/graphql?operationName=Now&variables=%7B%22stationId%22%3A7%7D"
    },
    { 
      id: 'rp',
      name: "Radio Paradise", 
      country: "USA", 
      city: "California", 
      timezone: "America/Los_Angeles", 
      stream: "https://stream.radioparadise.com/mp3-128", 
      logo: "https://img.radioparadise.com/covers/l/B000000.jpg",
      metadataUrl: "https://api.radioparadise.com/api/now_playing?chan=0"
    },
    { 
      id: 'nts',
      name: "NTS Radio", 
      country: "Reino Unido", 
      city: "Londres", 
      timezone: "Europe/London", 
      stream: "https://stream-mixtape-geo.ntslive.net/mixtape", 
      logo: "https://pbs.twimg.com/profile_images/1630226075535544320/xrT89-vr_400x400.jpg",
      metadataUrl: "https://www.nts.live/api/v2/live"
    },
    { 
      id: 'bbc6',
      name: "BBC 6 Music", 
      country: "Reino Unido", 
      city: "Londres", 
      timezone: "Europe/London", 
      stream: "https://stream.live.vc.bbcmedia.co.uk/bbc_6music", 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/BBC_Radio_6_Music.svg/1200px-BBC_Radio_6_Music.svg.png",
      metadataUrl: null
    }
  ];

  const [currentStation, setCurrentStation] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [currentTrack, setCurrentTrack] = useState({
    title: "Selecciona una radio para comenzar",
    artist: "",
    album: "",
    cover: null
  });

  const [history, setHistory] = useState([]);

  const audioRef = useRef(null);
  const metadataIntervalRef = useRef(null);
  const isStartingRef = useRef(false);

  /* ===================== TIME ===================== */
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => metadataIntervalRef.current && clearInterval(metadataIntervalRef.current);
  }, []);

  /* ===================== HELPERS ===================== */
  const getMarqueeClassName = (text, max) =>
    text && text.length > max ? 'marquee-content' : 'marquee-content short';

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

  /* ===================== METADATA ===================== */
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
      const res = await fetch(station.metadataUrl);
      const data = await res.json();

      let track = {
        title: "Información no disponible",
        artist: "",
        album: "",
        cover: null
      };

      if (station.id === 'kexp') {
        const play = data.results?.[0];
        if (play) track = {
          title: play.song,
          artist: play.artist,
          album: play.album,
          cover: play.thumbnail_uri
        };
      }

      if (station.id === 'rp' && data.title) {
        track = {
          title: data.title,
          artist: data.artist,
          album: data.album,
          cover: data.cover ? `https://img.radioparadise.com/${data.cover}` : null
        };
      }

      setCurrentTrack(track);

      setHistory(prev => {
        if (prev[0]?.title === track.title) return prev;
        return [{
          ...track,
          station: station.name,
          city: station.city,
          country: station.country,
          time: new Date().toLocaleTimeString('es-ES')
        }, ...prev];
      });

    } catch {
      setCurrentTrack({
        title: `Escuchando ${station.name}`,
        artist: "",
        album: "",
        cover: null
      });
    } finally {
      setLoading(false);
    }
  };

  /* ===================== PLAYER ===================== */
  const playStation = (station) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    setCurrentStation(station);
    audioRef.current.src = station.stream;
    audioRef.current.load();

    audioRef.current.play()
      .then(() => {
        setPlaying(true);
        fetchMetadata(station);
        metadataIntervalRef.current = setInterval(
          () => fetchMetadata(station),
          30000
        );
      })
      .finally(() => {
        isStartingRef.current = false;
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

  /* ===================== UI ===================== */
  return (
    <div className="radio-app">
      <audio ref={audioRef} crossOrigin="anonymous" />

      {!showHistory ? (
        <div className="main-container">

          {/* HEADER RADIO */}
          <div className="station-header-top">
            {currentStation ? (
              <span className="station-playing">
                {playing && <span className="playing-indicator" />}
                {currentStation.name} — {currentStation.city}
              </span>
            ) : (
              'Selecciona una radio'
            )}
          </div>

          {/* CLOCKS */}
          <div className="clocks-horizontal">
            <div className="clock-item">
              <div className="clock-label-top">HORA LOCAL</div>
              <div className="clock-time-large">
                {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="clock-item">
              <div className="clock-label-top">
                {currentStation ? currentStation.city.toUpperCase() : 'CIUDAD'}
              </div>
              <div className="clock-time-large">
                {currentStation ? getLocalTime(currentStation.timezone) : '--:--'}
              </div>
            </div>
          </div>

          {/* COVER */}
          <div className="album-cover-main">
            {currentTrack.cover ? (
              <img src={currentTrack.cover} className="album-cover-image" />
            ) : currentStation ? (
              <img src={currentStation.logo} className="album-cover-logo" />
            ) : (
              <Radio size={80} opacity={0.2} />
            )}

            <div className="controls-overlay">
              <button onClick={togglePlay} className="play-button-overlay">
                {playing ? <Pause size={48} /> : <Play size={48} />}
              </button>
              {currentStation && (
                <button onClick={playRandomStation} className="skip-button-overlay">
                  <SkipForward size={32} />
                </button>
              )}
            </div>
          </div>

          {/* TRACK INFO */}
          <div className="track-info-section">
            <div className="marquee-container">
              <div className={getMarqueeClassName(currentTrack.title, 40)}>
                <span>{currentTrack.title}</span>
                <span>{currentTrack.title}</span>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
};

export default RadioApp;

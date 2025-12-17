import React from 'react';

export default function HistoryDrawer({ 
  history, 
  historyOpen, 
  setHistoryOpen,
  drawerTouchStartYRef,
  drawerTouchStartXRef
}) {
  return (
    <div
      className={`history-view ${historyOpen ? 'history-view-open' : 'history-view-closed'}`}
      onTouchStart={(e) => {
        drawerTouchStartYRef.current = e.touches[0].clientY;
        drawerTouchStartXRef.current = e.touches[0].clientX;
      }}
      onTouchMove={(e) => {
        if (drawerTouchStartYRef.current !== null && historyOpen) {
          const deltaY = e.touches[0].clientY - drawerTouchStartYRef.current;
          const deltaX = Math.abs(e.touches[0].clientX - drawerTouchStartXRef.current);
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
        
        if (Math.abs(deltaY) > deltaX && Math.abs(deltaY) > minSwipeDistance) {
          if (deltaY < 0 && !historyOpen) {
            setHistoryOpen(true);
          } else if (deltaY > 0 && historyOpen) {
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
  );
}


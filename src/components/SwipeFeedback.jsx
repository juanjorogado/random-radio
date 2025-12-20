import React, { useEffect, useState } from 'react';

/**
 * Componente de feedback visual para swipes
 * @param {string} direction - 'left' o 'right'
 */
export default function SwipeFeedback({ direction }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (direction) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [direction]);

  if (!show || !direction) return null;

  return (
    <div className={`swipe-feedback swipe-${direction}`}>
      <div className="swipe-arrow">
        {direction === 'left' ? '‹' : '›'}
      </div>
    </div>
  );
}




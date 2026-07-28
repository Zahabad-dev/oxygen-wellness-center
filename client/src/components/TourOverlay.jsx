import { useEffect, useState } from 'react';

// Overlay visual del tutorial: oscurece todo menos el elemento señalado (el "spotlight"
// usa un box-shadow enorme, truco clásico de recorte) y coloca una tarjeta con el texto
// del paso cerca de ese elemento, sin taparlo.
export default function TourOverlay({ tour }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!tour.active || !tour.step) { setRect(null); return; }
    const el = tour.step.selector ? document.querySelector(tour.step.selector) : null;
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const t = setTimeout(() => setRect(el.getBoundingClientRect()), 260);
      return () => clearTimeout(t);
    }
    setRect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.active, tour.stepIndex]);

  if (!tour.active || !tour.step) return null;

  const pad = 8;
  const spotlightStyle = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  let cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  if (rect) {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const cardWidth = 300;
    const espacioAbajo = vh - rect.bottom;
    const arriba = espacioAbajo < 240 && rect.top > 240;
    const top = arriba ? Math.max(12, rect.top - 12) : Math.min(vh - 12, rect.bottom + 12);
    const left = Math.min(Math.max(12, rect.left), vw - cardWidth - 12);
    cardStyle = arriba
      ? { top, left, transform: 'translateY(-100%)' }
      : { top, left, transform: 'none' };
  }

  return (
    <div className="tour-layer">
      {rect ? (
        <div className="tour-spotlight" style={spotlightStyle} />
      ) : (
        <div className="tour-dim" />
      )}
      <div className="tour-card" style={cardStyle}>
        <span className="tour-count">{tour.stepIndex + 1} / {tour.total}</span>
        <h4>{tour.step.title}</h4>
        <p>{tour.step.body}</p>
        <div className="tour-actions">
          <button className="btn btn-ghost" onClick={tour.skip} style={{ fontSize: 12.5 }}>Saltar tutorial</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {tour.stepIndex > 0 && (
              <button className="btn btn-secondary" onClick={tour.prev} style={{ padding: '7px 14px', fontSize: 13 }}>Atrás</button>
            )}
            <button className="btn btn-primary" onClick={tour.next} style={{ padding: '7px 16px', fontSize: 13 }}>
              {tour.stepIndex === tour.total - 1 ? 'Terminar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

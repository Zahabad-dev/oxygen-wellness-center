import { useEffect, useState } from 'react';
import { useNotifications } from '../lib/useNotifications.js';

const fecha = (iso) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function NotificationBell({ baseEndpoint }) {
  const { items, noLeidas, nuevo, marcarLeida, limpiarNuevo } = useNotifications(baseEndpoint);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!nuevo) return;
    const t = setTimeout(limpiarNuevo, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevo]);

  return (
    <div className="notif-wrap">
      <button className="notif-bell" type="button" onClick={() => setAbierto((v) => !v)} aria-label="Notificaciones">
        🔔
        {noLeidas > 0 && <span className="notif-badge">{noLeidas}</span>}
      </button>

      {abierto && (
        <>
          <div className="notif-backdrop" onClick={() => setAbierto(false)} />
          <div className="notif-dropdown">
            <div className="notif-dropdown-head">Notificaciones</div>
            {items.length === 0 && <div className="notif-empty">Sin notificaciones todavía.</div>}
            {items.map((n) => (
              <button key={n.id} className={`notif-item ${n.leida ? '' : 'unread'}`} type="button" onClick={() => marcarLeida(n.id)}>
                <strong>{n.titulo}</strong>
                <p>{n.mensaje}</p>
                <span className="notif-time">{fecha(n.created_at)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {nuevo && (
        <div className="notif-toast" onClick={() => { marcarLeida(nuevo.id); limpiarNuevo(); }}>
          <strong>{nuevo.titulo}</strong>
          <p>{nuevo.mensaje}</p>
        </div>
      )}
    </div>
  );
}

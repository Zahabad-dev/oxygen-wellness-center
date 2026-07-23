import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/apiClient.js';
import { disciplineTheme } from '../lib/disciplineTheme.js';
import ClienteQrCard from './ClienteQrCard.jsx';

export default function BookingModal({ claseId, onClose }) {
  const [clase, setClase] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ nombre: '', whatsapp: '', email: '' });
  const [resultado, setResultado] = useState(null); // { qrToken, estado, posicionEspera }

  useEffect(() => {
    setClase(null);
    setError('');
    setResultado(null);
    setForm({ nombre: '', whatsapp: '', email: '' });
    if (claseId) {
      apiGet(`/clases/${claseId}`).then(setClase).catch((err) => setError(err.message));
    }
  }, [claseId]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!claseId) return null;

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    setEnviando(true);
    try {
      const data = await apiPost('/reservas', { claseId: Number(claseId), ...form });
      setResultado({ qrToken: data.cliente.qrToken, estado: data.estado, posicionEspera: data.posicionEspera });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const theme = clase ? disciplineTheme(clase.disciplina_nombre) : null;
  const lleno = clase ? clase.cupoDisponible <= 0 : false;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        {error && <div className="alert error">{error}</div>}
        {!clase && !error && <div className="page-loading">Cargando…</div>}

        {clase && !resultado && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="disc-dot" style={{ background: theme.color }} />
              <span className="eyebrow">{clase.disciplina_nombre}</span>
            </div>
            <h2 style={{ fontSize: 22 }}>{clase.disciplina_nombre} con {clase.coach_nombre}</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
              {clase.fecha} · {clase.hora_inicio?.slice(0, 5)} · {clase.duracion_minutos} min · {clase.salon_nombre}
              {clase.nivel ? ` · ${clase.nivel}` : ''}
            </p>
            {clase.descripcion && <p style={{ fontSize: 13.5 }}>{clase.descripcion}</p>}

            {lleno ? (
              <div className="alert warning">Esta clase está llena — puedes unirte a la lista de espera.</div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{clase.cupoDisponible} lugares disponibles.</p>
            )}

            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="m-nombre">Nombre</label>
                <input id="m-nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="m-whatsapp">WhatsApp</label>
                <input id="m-whatsapp" required placeholder="+52 55 1234 5678" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="m-email">Correo (opcional)</label>
                <input id="m-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              {formError && <div className="alert error">{formError}</div>}
              <button className="btn btn-primary btn-block" type="submit" disabled={enviando}>
                {enviando ? 'Reservando…' : lleno ? 'Unirme a la lista de espera' : 'Reservar'}
              </button>
            </form>
          </>
        )}

        {resultado && (
          <div style={{ textAlign: 'center' }}>
            {resultado.estado === 'lista_espera' ? (
              <div className="alert warning">
                Estás en la lista de espera (posición Nº{resultado.posicionEspera}).
              </div>
            ) : (
              <div className="alert success">¡Reserva confirmada! Este es tu QR para siempre.</div>
            )}
            <ClienteQrCard qrToken={resultado.qrToken} heading="Tu identificación en Oxygen" />
          </div>
        )}
      </div>
    </div>
  );
}

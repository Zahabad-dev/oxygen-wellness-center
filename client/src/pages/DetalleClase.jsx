import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/apiClient.js';

export default function DetalleClase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clase, setClase] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ nombre: '', whatsapp: '', email: '' });

  useEffect(() => {
    apiGet(`/clases/${id}`).then(setClase).catch((err) => setError(err.message));
  }, [id]);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    setEnviando(true);
    try {
      const resultado = await apiPost('/reservas', { claseId: Number(id), ...form });
      navigate(`/reserva-confirmada/${resultado.cliente.qrToken}`, {
        state: { estado: resultado.estado, posicionEspera: resultado.posicionEspera },
      });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (error) return <div className="alert error">{error}</div>;
  if (!clase) return <div className="page-loading">Cargando…</div>;

  const lleno = clase.cupoDisponible <= 0;

  return (
    <div className="page">
      <Link to="/" style={{ fontSize: 13 }}>&larr; Volver al catálogo</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 4px' }}>
        <span className="disc-dot" style={{ background: clase.disciplina_color }} />
        <span className="eyebrow">{clase.disciplina_nombre}</span>
      </div>
      <h1>{clase.disciplina_nombre} con {clase.coach_nombre}</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        {clase.fecha} · {clase.hora_inicio?.slice(0, 5)} · {clase.duracion_minutos} minutos · {clase.salon_nombre}
        {clase.nivel ? ` · ${clase.nivel}` : ''}
      </p>
      {clase.descripcion && <p>{clase.descripcion}</p>}
      {clase.coach_bio && <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>{clase.coach_bio}</p>}

      <div className="card" style={{ maxWidth: 420 }}>
        {lleno ? (
          <div className="alert warning">Esta clase está llena — puedes unirte a la lista de espera y te avisaremos si se libera un lugar.</div>
        ) : (
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>{clase.cupoDisponible} lugares disponibles.</p>
        )}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="whatsapp">WhatsApp</label>
            <input id="whatsapp" required placeholder="+52 55 1234 5678" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="email">Correo (opcional)</label>
            <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {formError && <div className="alert error">{formError}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={enviando}>
            {enviando ? 'Reservando…' : lleno ? 'Unirme a la lista de espera' : 'Reservar'}
          </button>
        </form>
      </div>
    </div>
  );
}

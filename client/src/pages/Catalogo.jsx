import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/apiClient.js';

export default function Catalogo() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [clases, setClases] = useState([]);
  const [disciplinaId, setDisciplinaId] = useState(null);
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiGet('/disciplinas').then(setDisciplinas).catch(() => {});
  }, []);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams();
    if (disciplinaId) params.set('disciplina', disciplinaId);
    if (fecha) params.set('fecha', fecha);
    apiGet(`/clases?${params.toString()}`)
      .then((data) => { setClases(data); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [disciplinaId, fecha]);

  const disciplinasPorId = useMemo(
    () => Object.fromEntries(disciplinas.map((d) => [d.id, d])),
    [disciplinas]
  );

  return (
    <div>
      <span className="eyebrow">Oxygen Wellness Center</span>
      <h1>Clases disponibles</h1>
      <p style={{ color: 'var(--ink-soft)' }}>Reserva tu lugar en segundos — solo necesitas tu nombre y tu WhatsApp.</p>

      <div className="chip-row">
        <span
          className={`chip ${!disciplinaId ? 'active' : ''}`}
          onClick={() => setDisciplinaId(null)}
        >
          Todas
        </span>
        {disciplinas.map((d) => (
          <span
            key={d.id}
            className={`chip ${disciplinaId === d.id ? 'active' : ''}`}
            onClick={() => setDisciplinaId(d.id)}
          >
            <span className="disc-dot" style={{ background: d.color, marginRight: 6 }} />
            {d.nombre}
          </span>
        ))}
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ border: '1px solid var(--line)', borderRadius: 100, padding: '5px 12px', fontSize: 13 }}
        />
      </div>

      {error && <div className="alert error">{error}</div>}
      {cargando && <div className="page-loading">Cargando clases…</div>}

      {!cargando && !error && clases.length === 0 && (
        <div className="card">No hay clases programadas con esos filtros por ahora.</div>
      )}

      <div className="grid cols-2">
        {clases.map((c) => {
          const disciplina = disciplinasPorId[c.disciplina_id];
          const porcentaje = Math.min(100, Math.round((c.confirmadas / c.capacidad_maxima) * 100));
          const lleno = c.cupoDisponible <= 0;
          return (
            <Link key={c.id} to={`/clase/${c.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="disc-dot" style={{ background: c.disciplina_color || disciplina?.color }} />
                <strong>{c.disciplina_nombre}</strong>
                {c.nivel && <span className="pill accent">{c.nivel}</span>}
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 13.5 }}>
                {c.coach_nombre} · {c.fecha} · {c.hora_inicio?.slice(0, 5)} · {c.duracion_minutos} min
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-faint)' }}>{c.salon_nombre}</p>
              <div className="progress"><span style={{ width: `${porcentaje}%`, background: lleno ? 'var(--critical)' : undefined }} /></div>
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                {lleno ? 'Clase llena — únete a la lista de espera' : `${c.cupoDisponible} lugares disponibles`}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

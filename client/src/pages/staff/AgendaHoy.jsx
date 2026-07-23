import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ESTADO_LABEL = {
  confirmada: { text: 'confirmada', className: 'success' },
  lista_espera: { text: 'lista de espera', className: 'warning' },
  asistio: { text: 'asistió', className: 'accent' },
};

export default function AgendaHoy() {
  const { user } = useAuth();
  const [clases, setClases] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiGet('/staff/agenda-hoy')
      .then(setClases)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <span className="eyebrow">Hoy</span>
      <h1>Agenda de hoy</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        {user.rol === 'coach' ? 'Tus clases de hoy.' : 'Todas las clases del centro.'}
      </p>

      {error && <div className="alert error">{error}</div>}
      {cargando && <div className="page-loading">Cargando…</div>}
      {!cargando && clases.length === 0 && <div className="card">No hay clases programadas para hoy.</div>}

      {clases.map((c) => (
        <div key={c.id} className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="disc-dot" style={{ background: c.disciplina_color }} />
                <strong>{c.disciplina_nombre}</strong>
                <span className="pill accent">{c.hora_inicio?.slice(0, 5)}</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                {c.coach_nombre} · {c.salon_nombre} · {c.roster.length}/{c.capacidad_maxima}
              </p>
            </div>
            <Link className="btn btn-primary" to={`/staff/checkin?clase=${c.id}`}>Check-in</Link>
          </div>

          {c.roster.length > 0 && (
            <table style={{ marginTop: 12 }}>
              <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Estado</th></tr></thead>
              <tbody>
                {c.roster.map((r) => {
                  const estado = ESTADO_LABEL[r.estado] || { text: r.estado, className: 'accent' };
                  return (
                    <tr key={r.reservaId}>
                      <td>{r.nombre}</td>
                      <td>{r.whatsapp}</td>
                      <td>
                        <span className={`pill ${estado.className}`}>
                          {estado.text}{r.estado === 'lista_espera' ? ` Nº${r.posicionEspera}` : ''}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

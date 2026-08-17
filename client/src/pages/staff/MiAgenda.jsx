import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/apiClient.js';

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const hoyIso = () => new Date().toISOString().slice(0, 10);

const ESTADO_LABEL = {
  confirmada: { text: 'confirmada', className: 'success' },
  lista_espera: { text: 'lista de espera', className: 'warning' },
  asistio: { text: 'asistió', className: 'accent' },
};

// Matriz de 6 semanas x 7 días para el mes de `mesBase` — igual patrón que Admin > Clases.
function construirMes(mesBase) {
  const primero = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1);
  const inicio = new Date(primero);
  inicio.setDate(inicio.getDate() - primero.getDay());
  const celdas = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    celdas.push({
      iso: d.toISOString().slice(0, 10),
      dia: d.getDate(),
      delMes: d.getMonth() === mesBase.getMonth(),
    });
  }
  return celdas;
}

export default function MiAgenda() {
  const [resumen, setResumen] = useState(null);
  const [clases, setClases] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mesBase, setMesBase] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  useEffect(() => {
    apiGet('/staff/mi-agenda/resumen').then(setResumen).catch(() => {});
    apiGet('/staff/mi-agenda/clases')
      .then(setClases)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  const clasesPorDia = {};
  for (const c of clases) {
    if (!clasesPorDia[c.fecha]) clasesPorDia[c.fecha] = [];
    clasesPorDia[c.fecha].push(c);
  }
  const celdasMes = construirMes(mesBase);
  const nombreMes = mesBase.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div className="page">
      <span className="eyebrow">Coach</span>
      <h1>Mi agenda</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Tu calendario individual — toca cualquier día para ver quién tiene reserva o ya asistió.
      </p>

      {error && <div className="alert error">{error}</div>}

      {resumen && (
        <div className="grid cols-2" style={{ maxWidth: 420, marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <span className="eyebrow">Clases impartidas</span>
            <p style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 0' }}>{resumen.clases_impartidas}</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <span className="eyebrow">Personas atendidas</span>
            <p style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 0' }}>{resumen.personas_atendidas}</p>
          </div>
        </div>
      )}

      {cargando && <div className="page-loading">Cargando…</div>}

      {!cargando && (
        <div className="admin-calendar">
          <div className="admin-calendar-head">
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setMesBase((m) => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; })}>‹</button>
            <strong style={{ textTransform: 'capitalize' }}>{nombreMes}</strong>
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setMesBase((m) => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; })}>›</button>
          </div>
          <div className="admin-calendar-dow">
            {DOW.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="admin-calendar-grid">
            {celdasMes.map((celda) => (
              <div
                key={celda.iso}
                className={`admin-calendar-cell ${celda.delMes ? '' : 'other-month'} ${celda.iso === hoyIso() ? 'today' : ''} ${celda.iso === diaSeleccionado ? 'selected' : ''}`}
                onClick={() => setDiaSeleccionado((actual) => (actual === celda.iso ? null : celda.iso))}
              >
                <span className="admin-calendar-daynum">{celda.dia}</span>
                <div className="admin-calendar-chips">
                  {(clasesPorDia[celda.iso] || []).map((c) => (
                    <span
                      key={c.id}
                      className="admin-calendar-chip"
                      style={{ '--chip-color': c.disciplina_color }}
                      title={`${c.disciplina_nombre} · ${c.roster.length}/${c.capacidad_maxima}`}
                    >
                      <span className="admin-calendar-chip-hora">{c.hora_inicio?.slice(0, 5)}</span>
                      <span className="admin-calendar-chip-disc"> {c.disciplina_nombre}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {diaSeleccionado && (
            <div className="modal-backdrop" onClick={() => setDiaSeleccionado(null)}>
              <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <button className="modal-close" onClick={() => setDiaSeleccionado(null)} aria-label="Cerrar">✕</button>
                <h3 style={{ marginTop: 0 }}>{diaSeleccionado}</h3>

                {(clasesPorDia[diaSeleccionado] || []).length === 0 && (
                  <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>No tenías clases este día.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(clasesPorDia[diaSeleccionado] || []).map((c) => (
                    <div key={c.id} style={{ border: '1px solid var(--line)', borderLeft: `4px solid ${c.disciplina_color || 'var(--accent)'}`, borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                      <strong>{c.hora_inicio?.slice(0, 5)}</strong> {c.disciplina_nombre} · {c.salon_nombre}
                      {' '}<span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.roster.length}/{c.capacidad_maxima}</span>
                      {c.estado === 'cancelada' && <span className="pill critical" style={{ marginLeft: 6 }}>cancelada</span>}

                      {c.roster.length > 0 ? (
                        <table className="responsive" style={{ marginTop: 10 }}>
                          <thead><tr><th>Cliente</th><th>Estado</th></tr></thead>
                          <tbody>
                            {c.roster.map((r) => {
                              const estado = ESTADO_LABEL[r.estado] || { text: r.estado, className: 'accent' };
                              return (
                                <tr key={r.reservaId}>
                                  <td data-label="Cliente">{r.nombre}</td>
                                  <td data-label="Estado">
                                    <span className={`pill ${estado.className}`}>
                                      {estado.text}{r.estado === 'lista_espera' ? ` Nº${r.posicionEspera}` : ''}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 8, marginBottom: 0 }}>Nadie ha reservado esta clase.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

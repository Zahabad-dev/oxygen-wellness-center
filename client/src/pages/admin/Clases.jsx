import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';

const FORM_VACIO = {
  id: null, disciplinaId: '', coachId: '', salonId: '', fecha: '', horaInicio: '',
  duracionMinutos: 50, capacidadMaxima: 10, nivel: '', descripcion: '',
};

const ESTADO_LABEL = { programada: 'success', cancelada: 'critical', completada: 'accent' };
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const hoyIso = () => new Date().toISOString().slice(0, 10);

// Matriz de celdas (6 semanas x 7 días) para el mes de `mesBase`, incluyendo colas
// del mes anterior/siguiente para completar semanas — igual que cualquier calendario mensual.
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

export default function Clases() {
  const [clases, setClases] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [salones, setSalones] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista] = useState('lista');
  const [mesBase, setMesBase] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  function cargarClases() {
    apiGet('/admin/clases').then(setClases).catch((err) => setError(err.message));
  }

  useEffect(() => {
    cargarClases();
    apiGet('/disciplinas').then(setDisciplinas).catch(() => {});
    apiGet('/admin/coaches').then((data) => setCoaches(data.filter((c) => c.activo))).catch(() => {});
    apiGet('/admin/salones').then(setSalones).catch(() => {});
  }, []);

  function editar(c) {
    setForm({
      id: c.id,
      disciplinaId: c.disciplina_id,
      coachId: c.coach_id,
      salonId: c.salon_id,
      fecha: c.fecha,
      horaInicio: c.hora_inicio?.slice(0, 5),
      duracionMinutos: c.duracion_minutos,
      capacidadMaxima: c.capacidad_maxima,
      nivel: c.nivel || '',
      descripcion: c.descripcion || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (form.id) {
        await apiPut(`/admin/clases/${form.id}`, form);
      } else {
        await apiPost('/admin/clases', form);
      }
      setForm(FORM_VACIO);
      cargarClases();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cancelar(c) {
    if (!confirm('¿Cancelar esta clase? Los clientes con reserva seguirán viéndola como cancelada.')) return;
    await apiPut(`/admin/clases/${c.id}`, { estado: 'cancelada' });
    cargarClases();
  }

  async function borrar(c) {
    if (!confirm('¿Borrar esta clase por completo? Solo funciona si no tiene reservas.')) return;
    try {
      await apiDelete(`/admin/clases/${c.id}`);
      cargarClases();
    } catch (err) {
      alert(err.message);
    }
  }

  function nuevaEnFecha(iso) {
    setForm({ ...FORM_VACIO, fecha: iso });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function abrirDia(iso) {
    setDiaSeleccionado((actual) => (actual === iso ? null : iso));
  }

  const clasesPorDia = {};
  for (const c of clases) {
    if (!clasesPorDia[c.fecha]) clasesPorDia[c.fecha] = [];
    clasesPorDia[c.fecha].push(c);
  }
  const celdasMes = construirMes(mesBase);
  const nombreMes = mesBase.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Clases</h1>
      <AdminNav />

      <form onSubmit={onSubmit} className="card" style={{ marginBottom: 24, maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>{form.id ? 'Editar clase' : 'Nueva clase'}</h3>
        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="disciplina">Disciplina</label>
            <select id="disciplina" required value={form.disciplinaId} onChange={(e) => setForm({ ...form, disciplinaId: e.target.value })}>
              <option value="">Selecciona…</option>
              {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="coach">Coach / asesor</label>
            <select id="coach" required value={form.coachId} onChange={(e) => setForm({ ...form, coachId: e.target.value })}>
              <option value="">Selecciona…</option>
              {coaches.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="salon">Salón</label>
            <select id="salon" required value={form.salonId} onChange={(e) => setForm({ ...form, salonId: e.target.value })}>
              <option value="">Selecciona…</option>
              {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="nivel">Nivel (opcional)</label>
            <input id="nivel" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} placeholder="Todos los niveles" />
          </div>
          <div className="field">
            <label htmlFor="fecha">Fecha</label>
            <input id="fecha" type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="hora">Hora</label>
            <input id="hora" type="time" required value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="duracion">Duración (min)</label>
            <input id="duracion" type="number" min="10" step="5" value={form.duracionMinutos} onChange={(e) => setForm({ ...form, duracionMinutos: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label htmlFor="capacidad">Capacidad máxima</label>
            <input id="capacidad" type="number" min="1" required value={form.capacidadMaxima} onChange={(e) => setForm({ ...form, capacidadMaxima: Number(e.target.value) })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="descripcion">Descripción (opcional)</label>
          <textarea id="descripcion" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        {error && <div className="alert error">{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" type="submit" disabled={guardando}>
            {form.id ? 'Guardar cambios' : 'Crear clase'}
          </button>
          {form.id && (
            <button type="button" className="btn btn-secondary" onClick={() => setForm(FORM_VACIO)}>Cancelar edición</button>
          )}
        </div>
      </form>

      <div className="chip-row">
        <span className={`chip ${vista === 'lista' ? 'active' : ''}`} onClick={() => setVista('lista')}>Lista</span>
        <span className={`chip ${vista === 'calendario' ? 'active' : ''}`} onClick={() => setVista('calendario')}>Calendario</span>
      </div>

      {vista === 'lista' ? (
        <table className="responsive">
          <thead>
            <tr><th>Fecha</th><th>Hora</th><th>Disciplina</th><th>Coach</th><th>Salón</th><th>Cupo</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {clases.map((c) => (
              <tr key={c.id}>
                <td data-label="Fecha">{c.fecha}</td>
                <td data-label="Hora">{c.hora_inicio?.slice(0, 5)}</td>
                <td data-label="Disciplina"><span className="disc-dot" style={{ background: c.disciplina_color, marginRight: 6 }} />{c.disciplina_nombre}</td>
                <td data-label="Coach">{c.coach_nombre}</td>
                <td data-label="Salón">{c.salon_nombre}</td>
                <td data-label="Cupo">{c.capacidad_maxima}</td>
                <td data-label="Estado"><span className={`pill ${ESTADO_LABEL[c.estado] || 'accent'}`}>{c.estado}</span></td>
                <td data-label="Acciones" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => editar(c)}>Editar</button>
                  {c.estado === 'programada' && (
                    <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => cancelar(c)}>Cancelar</button>
                  )}
                  <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5, color: 'var(--critical)' }} onClick={() => borrar(c)}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
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
                onClick={() => abrirDia(celda.iso)}
              >
                <span className="admin-calendar-daynum">{celda.dia}</span>
                <div className="admin-calendar-chips">
                  {(clasesPorDia[celda.iso] || []).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="admin-calendar-chip"
                      style={{ '--chip-color': c.disciplina_color }}
                      onClick={(e) => { e.stopPropagation(); editar(c); }}
                      title={`${c.disciplina_nombre} · ${c.coach_nombre}`}
                    >
                      {c.hora_inicio?.slice(0, 5)} {c.disciplina_nombre}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {diaSeleccionado && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Clases del {diaSeleccionado}</h3>
                <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setDiaSeleccionado(null)}>✕</button>
              </div>

              {(clasesPorDia[diaSeleccionado] || []).length === 0 && (
                <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, margin: '0 0 10px' }}>Sin clases programadas este día.</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {(clasesPorDia[diaSeleccionado] || []).map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                    <span>
                      <span className="disc-dot" style={{ background: c.disciplina_color, marginRight: 6 }} />
                      <strong>{c.hora_inicio?.slice(0, 5)}</strong> {c.disciplina_nombre} · {c.coach_nombre}
                      {' '}<span className={`pill ${ESTADO_LABEL[c.estado] || 'accent'}`} style={{ marginLeft: 4 }}>{c.estado}</span>
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => editar(c)}>Editar</button>
                      {c.estado === 'programada' && (
                        <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => cancelar(c)}>Cancelar</button>
                      )}
                      <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5, color: 'var(--critical)' }} onClick={() => borrar(c)}>Borrar</button>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="btn btn-primary" onClick={() => nuevaEnFecha(diaSeleccionado)}>+ Nueva clase este día</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

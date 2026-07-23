import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';

const FORM_VACIO = {
  id: null, disciplinaId: '', coachId: '', salonId: '', fecha: '', horaInicio: '',
  duracionMinutos: 50, capacidadMaxima: 10, nivel: '', descripcion: '',
};

const ESTADO_LABEL = { programada: 'success', cancelada: 'critical', completada: 'accent' };

export default function Clases() {
  const [clases, setClases] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [salones, setSalones] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

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
    </div>
  );
}

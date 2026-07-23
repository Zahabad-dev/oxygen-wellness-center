import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';

const FORM_VACIO = { id: null, nombre: '', bio: '', fotoUrl: '', disciplinaIds: [] };

export default function Coaches() {
  const [coaches, setCoaches] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    apiGet('/admin/coaches').then(setCoaches).catch((err) => setError(err.message));
  }

  useEffect(() => {
    cargar();
    apiGet('/disciplinas').then(setDisciplinas).catch(() => {});
  }, []);

  function toggleDisciplina(id) {
    setForm((f) => ({
      ...f,
      disciplinaIds: f.disciplinaIds.includes(id)
        ? f.disciplinaIds.filter((d) => d !== id)
        : [...f.disciplinaIds, id],
    }));
  }

  function editar(coach) {
    setForm({
      id: coach.id,
      nombre: coach.nombre,
      bio: coach.bio || '',
      fotoUrl: coach.foto_url || '',
      disciplinaIds: coach.disciplinas.map((d) => d.id),
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (form.id) {
        await apiPut(`/admin/coaches/${form.id}`, form);
      } else {
        await apiPost('/admin/coaches', form);
      }
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(coach) {
    if (!confirm(`¿Desactivar a ${coach.nombre}? Ya no aparecerá para asignar clases nuevas.`)) return;
    await apiDelete(`/admin/coaches/${coach.id}`);
    cargar();
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Coaches</h1>
      <AdminNav />

      <form onSubmit={onSubmit} className="card" style={{ marginBottom: 24, maxWidth: 520 }}>
        <h3 style={{ marginTop: 0 }}>{form.id ? 'Editar coach' : 'Nuevo coach'}</h3>
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="bio">Bio (opcional)</label>
          <textarea id="bio" rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="foto">URL de foto (opcional)</label>
          <input id="foto" value={form.fotoUrl} onChange={(e) => setForm({ ...form, fotoUrl: e.target.value })} placeholder="https://…" />
        </div>
        <div className="field">
          <label>Disciplinas que imparte</label>
          <div className="chip-row" style={{ marginBottom: 0 }}>
            {disciplinas.map((d) => (
              <span
                key={d.id}
                className={`chip ${form.disciplinaIds.includes(d.id) ? 'active' : ''}`}
                onClick={() => toggleDisciplina(d.id)}
              >
                {d.nombre}
              </span>
            ))}
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" type="submit" disabled={guardando}>
            {form.id ? 'Guardar cambios' : 'Crear coach'}
          </button>
          {form.id && (
            <button type="button" className="btn btn-secondary" onClick={() => setForm(FORM_VACIO)}>Cancelar</button>
          )}
        </div>
      </form>

      <div className="grid cols-2">
        {coaches.map((c) => (
          <div key={c.id} className="card" style={{ opacity: c.activo ? 1 : 0.5 }}>
            <h4 style={{ marginBottom: 4 }}>{c.nombre} {!c.activo && <span className="pill critical">inactivo</span>}</h4>
            {c.bio && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{c.bio}</p>}
            <div className="chip-row" style={{ marginBottom: 10 }}>
              {c.disciplinas.map((d) => <span key={d.id} className="pill accent">{d.nombre}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => editar(c)}>Editar</button>
              {c.activo && <button className="btn btn-ghost" onClick={() => desactivar(c)}>Desactivar</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

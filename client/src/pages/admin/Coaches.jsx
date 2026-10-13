import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';
import ImageUploadField from '../../components/ImageUploadField.jsx';

const FORM_VACIO = { id: null, nombre: '', bio: '', fotoUrl: '', disciplinaIds: [] };

export default function Coaches() {
  const [coaches, setCoaches] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [credenciales, setCredenciales] = useState(null);
  const [copiado, setCopiado] = useState(false);

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

  async function generarAcceso(coach) {
    const yaTiene = Boolean(coach.usuario);
    if (yaTiene && !confirm(`¿Restablecer la contraseña de ${coach.nombre}? La anterior deja de funcionar.`)) return;
    setError('');
    setCopiado(false);
    try {
      const data = await apiPost(`/admin/coaches/${coach.id}/acceso`, {});
      setCredenciales({ nombre: coach.nombre, usuario: data.usuario, password: data.password });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function quitarAcceso(coach) {
    if (!confirm(`¿Quitar el acceso de ${coach.nombre}? Ya no podrá iniciar sesión (puedes volver a generárselo).`)) return;
    await apiDelete(`/admin/coaches/${coach.id}/acceso`);
    cargar();
  }

  function textoCredenciales(c) {
    return `Oxigen Wellness Center — acceso de coach\nUsuario: ${c.usuario}\nContraseña: ${c.password}\nEntra en: ${window.location.origin}/staff/login`;
  }

  async function copiarCredenciales() {
    try {
      await navigator.clipboard.writeText(textoCredenciales(credenciales));
      setCopiado(true);
    } catch {
      setError('No se pudo copiar automáticamente — selecciona el texto y cópialo a mano.');
    }
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Coaches</h1>
      <AdminNav />

      {credenciales && (
        <div className="card" style={{ marginBottom: 24, maxWidth: 520, borderColor: 'var(--accent)' }}>
          <h3 style={{ marginTop: 0 }}>Acceso de {credenciales.nombre}</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: -4 }}>
            Guarda o envía estos datos ahora — la contraseña no se vuelve a mostrar (si se pierde, se genera una nueva).
          </p>
          <pre style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13.5, whiteSpace: 'pre-wrap', userSelect: 'all' }}>
            {textoCredenciales(credenciales)}
          </pre>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="button" onClick={copiarCredenciales}>{copiado ? 'Copiado' : 'Copiar'}</button>
            <button className="btn btn-secondary" type="button" onClick={() => setCredenciales(null)}>Listo, ya los guardé</button>
          </div>
        </div>
      )}

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
        <ImageUploadField
          id="foto"
          label="Foto del coach (opcional)"
          value={form.fotoUrl}
          onChange={(fotoUrl) => setForm({ ...form, fotoUrl })}
          hint="Medida recomendada: vertical, mínimo 900×1200 px (proporción 3:4)."
        />
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
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 0 10px' }}>
              {c.usuario
                ? <>Acceso: <strong>{c.usuario}</strong> {c.acceso_activo ? <span className="pill success">activo</span> : <span className="pill critical">sin acceso</span>}</>
                : 'Sin acceso al sistema todavía.'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => editar(c)}>Editar</button>
              <button className="btn btn-secondary" onClick={() => generarAcceso(c)}>
                {c.usuario ? 'Restablecer contraseña' : 'Generar acceso'}
              </button>
              {c.usuario && c.acceso_activo && <button className="btn btn-ghost" onClick={() => quitarAcceso(c)}>Quitar acceso</button>}
              {c.activo && <button className="btn btn-ghost" onClick={() => desactivar(c)}>Desactivar</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

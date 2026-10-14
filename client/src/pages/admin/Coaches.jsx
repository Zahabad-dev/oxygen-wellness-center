import { useEffect, useRef, useState } from 'react';
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
  // Todo lo de "acceso" se muestra DENTRO de la tarjeta del coach donde se hizo clic: el formulario
  // y sus mensajes están arriba de la página y, si el resultado salía allá, desde abajo parecía
  // que el botón no hacía nada.
  const [credenciales, setCredenciales] = useState(null); // { coachId, nombre, usuario, password }
  const [aviso, setAviso] = useState(null); // { coachId, tipo: 'ok' | 'error', texto }
  const [trabajando, setTrabajando] = useState(null); // coachId con una acción en curso
  const [copiado, setCopiado] = useState(false);
  const formRef = useRef(null);

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
    setError('');
    setForm({
      id: coach.id,
      nombre: coach.nombre,
      bio: coach.bio || '',
      fotoUrl: coach.foto_url || '',
      disciplinaIds: coach.disciplinas.map((d) => d.id),
    });
    formRef.current?.scrollIntoView({ block: 'start' });
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
    setAviso(null);
    setTrabajando(coach.id);
    try {
      await apiDelete(`/admin/coaches/${coach.id}`);
      cargar();
    } catch (err) {
      setAviso({ coachId: coach.id, tipo: 'error', texto: err.message });
    } finally {
      setTrabajando(null);
    }
  }

  async function generarAcceso(coach) {
    const yaTiene = Boolean(coach.usuario);
    if (yaTiene && !confirm(`¿Restablecer la contraseña de ${coach.nombre}? La anterior deja de funcionar.`)) return;
    setAviso(null);
    setCredenciales(null);
    setCopiado(false);
    setTrabajando(coach.id);
    try {
      const data = await apiPost(`/admin/coaches/${coach.id}/acceso`, {});
      setCredenciales({ coachId: coach.id, nombre: coach.nombre, usuario: data.usuario, password: data.password });
      cargar();
    } catch (err) {
      setAviso({ coachId: coach.id, tipo: 'error', texto: err.message });
    } finally {
      setTrabajando(null);
    }
  }

  async function quitarAcceso(coach) {
    if (!confirm(`¿Quitar el acceso de ${coach.nombre}? Ya no podrá iniciar sesión (puedes volver a generárselo).`)) return;
    setAviso(null);
    setCredenciales(null);
    setTrabajando(coach.id);
    try {
      await apiDelete(`/admin/coaches/${coach.id}/acceso`);
      setAviso({ coachId: coach.id, tipo: 'ok', texto: 'Acceso quitado. Ya no puede iniciar sesión.' });
      cargar();
    } catch (err) {
      setAviso({ coachId: coach.id, tipo: 'error', texto: err.message });
    } finally {
      setTrabajando(null);
    }
  }

  function textoCredenciales(c) {
    return `Oxigen Wellness Center — acceso de coach\nUsuario: ${c.usuario}\nContraseña: ${c.password}\nEntra en: ${window.location.origin}/staff/login`;
  }

  async function copiarCredenciales() {
    try {
      await navigator.clipboard.writeText(textoCredenciales(credenciales));
      setCopiado(true);
    } catch {
      setAviso({ coachId: credenciales.coachId, tipo: 'error', texto: 'No se pudo copiar automáticamente — selecciona el texto y cópialo a mano.' });
    }
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Coaches</h1>
      <AdminNav />

      <form ref={formRef} onSubmit={onSubmit} className="card" style={{ marginBottom: 24, maxWidth: 520 }}>
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
          onChange={(fotoUrl) => setForm((f) => ({ ...f, fotoUrl }))}
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
              <button className="btn btn-secondary" type="button" onClick={() => editar(c)}>Editar</button>
              <button className="btn btn-secondary" type="button" onClick={() => generarAcceso(c)} disabled={trabajando === c.id}>
                {trabajando === c.id ? 'Generando…' : c.usuario ? 'Restablecer contraseña' : 'Generar acceso'}
              </button>
              {c.usuario && c.acceso_activo && <button className="btn btn-ghost" type="button" onClick={() => quitarAcceso(c)} disabled={trabajando === c.id}>Quitar acceso</button>}
              {c.activo && <button className="btn btn-ghost" type="button" onClick={() => desactivar(c)} disabled={trabajando === c.id}>Desactivar</button>}
            </div>

            {aviso?.coachId === c.id && (
              <div className={`alert ${aviso.tipo === 'ok' ? 'success' : 'error'}`} style={{ marginTop: 12, marginBottom: 0 }}>{aviso.texto}</div>
            )}

            {credenciales?.coachId === c.id && (
              <div style={{ marginTop: 12, padding: 12, border: '1.5px solid var(--accent)', borderRadius: 'var(--radius-sm)' }}>
                <strong style={{ fontSize: 14 }}>Acceso de {credenciales.nombre}</strong>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 8px' }}>
                  Guarda o envía estos datos ahora — la contraseña no se vuelve a mostrar (si se pierde, se genera una nueva).
                </p>
                <pre style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, whiteSpace: 'pre-wrap', userSelect: 'all', margin: '0 0 10px' }}>
                  {textoCredenciales(credenciales)}
                </pre>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" type="button" onClick={copiarCredenciales}>{copiado ? 'Copiado' : 'Copiar'}</button>
                  <button className="btn btn-secondary" type="button" onClick={() => setCredenciales(null)}>Listo, ya los guardé</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

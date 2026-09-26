import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';

const FORM_VACIO = { id: null, nombre: '', clasesIncluidas: 4, precio: '', vigenciaDias: 30 };
const money = (n) => `$${Number(n).toLocaleString('es-MX')}`;

export default function Membresias() {
  const [membresias, setMembresias] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    apiGet('/admin/membresias').then(setMembresias).catch((err) => setError(err.message));
  }

  useEffect(cargar, []);

  function editar(m) {
    setMensaje('');
    setForm({
      id: m.id,
      nombre: m.nombre,
      clasesIncluidas: m.clases_incluidas,
      precio: m.precio,
      vigenciaDias: m.vigencia_dias,
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setMensaje('');
    setGuardando(true);
    try {
      if (form.id) {
        await apiPut(`/admin/membresias/${form.id}`, form);
      } else {
        await apiPost('/admin/membresias', form);
      }
      setMensaje(form.id ? 'Membresía actualizada — ya se ve en el sitio.' : 'Membresía creada — ya se ve en el sitio.');
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarActiva(m, activo) {
    setError('');
    try {
      await apiPut(`/admin/membresias/${m.id}`, {
        nombre: m.nombre, clasesIncluidas: m.clases_incluidas, precio: m.precio, vigenciaDias: m.vigencia_dias, activo,
      });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Membresías y precios</h1>
      <AdminNav />

      <p style={{ color: 'var(--ink-soft)', maxWidth: 560 }}>
        Los paquetes y precios que aparecen en el sitio y en el registro con membresía. Cambia un precio y se
        actualiza al instante. Si un paquete ya no se vende, desactívalo (no se borra porque hay clientes que ya
        lo compraron).
      </p>

      {error && <div className="alert error">{error}</div>}
      {mensaje && <div className="alert success">{mensaje}</div>}

      <form onSubmit={onSubmit} className="card" style={{ marginBottom: 24, maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>{form.id ? 'Editar membresía' : 'Nueva membresía'}</h3>
        <div className="field">
          <label htmlFor="m-nombre">Nombre</label>
          <input id="m-nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. 4 clases" />
        </div>
        <div className="field">
          <label htmlFor="m-clases">Clases incluidas</label>
          <input id="m-clases" type="number" min={1} required value={form.clasesIncluidas} onChange={(e) => setForm({ ...form, clasesIncluidas: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="m-precio">Precio (MXN)</label>
          <input id="m-precio" type="number" min={0} step="0.01" required value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="m-vigencia">Vigencia (días para usar las clases)</label>
          <input id="m-vigencia" type="number" min={1} required value={form.vigenciaDias} onChange={(e) => setForm({ ...form, vigenciaDias: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" type="submit" disabled={guardando}>{form.id ? 'Guardar cambios' : 'Crear membresía'}</button>
          {form.id && <button type="button" className="btn btn-secondary" onClick={() => setForm(FORM_VACIO)}>Cancelar</button>}
        </div>
      </form>

      <div className="grid cols-2">
        {membresias.map((m) => (
          <div key={m.id} className="card" style={{ opacity: m.activo ? 1 : 0.55 }}>
            <h4 style={{ marginBottom: 4 }}>{m.nombre} {!m.activo && <span className="pill critical">inactiva</span>}</h4>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 10px' }}>
              {money(m.precio)} · {m.clases_incluidas} {m.clases_incluidas === 1 ? 'clase' : 'clases'} · vigencia {m.vigencia_dias} días
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => editar(m)}>Editar</button>
              <button className="btn btn-ghost" onClick={() => cambiarActiva(m, !m.activo)}>{m.activo ? 'Desactivar' : 'Reactivar'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

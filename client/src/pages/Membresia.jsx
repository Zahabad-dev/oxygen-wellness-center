import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/apiClient.js';
import PasswordInput from '../components/PasswordInput.jsx';

const money = (n) => `$${Number(n).toLocaleString('es-MX')}`;

export default function Membresia() {
  const navigate = useNavigate();
  const [membresias, setMembresias] = useState([]);
  const [membresiaId, setMembresiaId] = useState(null);
  const [form, setForm] = useState({ nombre: '', whatsapp: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    apiGet('/membresias').then((data) => {
      setMembresias(data);
      if (data[0]) setMembresiaId(data[0].id);
    }).catch(() => {});
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!membresiaId) { setError('Elige una membresía.'); return; }
    setEnviando(true);
    try {
      await apiPost('/portal/registrar-membresia', { ...form, membresiaId });
      navigate('/mi-cuenta', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 480, margin: '0 auto' }}>
      <span className="eyebrow">Membresías</span>
      <h1>Regístrate y compra tu membresía</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Elige tu paquete, crea tu cuenta y ya puedes reservar tu primera clase mientras
        confirmamos tu pago en el centro — el resto de tus clases se activa en cuanto lo hagas.
      </p>

      <div className="grid cols-2" style={{ marginBottom: 20 }}>
        {membresias.map((m) => (
          <button
            key={m.id}
            type="button"
            className="card"
            onClick={() => setMembresiaId(m.id)}
            style={{
              textAlign: 'left', cursor: 'pointer',
              borderColor: membresiaId === m.id ? 'var(--accent)' : 'var(--line)',
              boxShadow: membresiaId === m.id ? '0 0 0 2px var(--accent)' : 'var(--shadow)',
            }}
          >
            <strong>{m.nombre}</strong>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>{money(m.precio)}</p>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="card">
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
        <div className="field">
          <label htmlFor="password">Crea una contraseña</label>
          <PasswordInput id="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
        </div>
        {error && <div className="alert error">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={enviando}>
          {enviando ? 'Creando tu cuenta…' : 'Registrarme y comprar membresía'}
        </button>
      </form>
      <p style={{ marginTop: 16 }}><Link to="/">Volver al catálogo</Link></p>
    </div>
  );
}

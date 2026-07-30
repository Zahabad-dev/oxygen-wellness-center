import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiPost } from '../lib/apiClient.js';
import PasswordInput from '../components/PasswordInput.jsx';
import { waLink } from '../lib/whatsapp.js';

const WHATSAPP_ESTUDIO = '5217751103675';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await apiPost('/portal/login', { whatsapp, password });
      navigate('/mi-cuenta', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 380, margin: '0 auto' }}>
      <span className="eyebrow">Mi cuenta</span>
      <h1>Entra a tu cuenta</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Si todavía no tienes acceso, pídelo la próxima vez que vengas al centro, o{' '}
        <Link to="/membresia">regístrate y compra tu membresía</Link> aquí mismo.
      </p>
      <form onSubmit={onSubmit} className="card">
        <div className="field">
          <label htmlFor="whatsapp">WhatsApp</label>
          <input id="whatsapp" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+52 55 1234 5678" />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <PasswordInput id="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <div className="alert error">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p style={{ marginTop: 12, textAlign: 'center' }}>
        <a
          href={waLink(WHATSAPP_ESTUDIO, 'Hola, olvidé la contraseña de mi cuenta en Oxigen Wellness Center. ¿Me ayudan a restablecerla?')}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 13 }}
        >
          Olvidé mi contraseña
        </a>
      </p>
      <p style={{ marginTop: 16 }}><Link to="/">Volver al catálogo</Link></p>
    </div>
  );
}

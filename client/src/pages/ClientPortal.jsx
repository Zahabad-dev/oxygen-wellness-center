import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/apiClient.js';
import ClienteQrCard from '../components/ClienteQrCard.jsx';

export default function ClientPortal() {
  const navigate = useNavigate();
  const [qrToken, setQrToken] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/portal/me')
      .then((data) => setQrToken(data.qrToken))
      .catch(() => navigate('/mi-cuenta/login', { replace: true }));
  }, [navigate]);

  async function salir() {
    await apiPost('/portal/logout', {});
    navigate('/', { replace: true });
  }

  if (error) return <div className="page"><div className="alert error">{error}</div></div>;
  if (!qrToken) return <div className="page-loading">Cargando…</div>;

  return (
    <div className="page" style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      <span className="eyebrow">Mi cuenta</span>
      <ClienteQrCard qrToken={qrToken} heading="Tu identificación en Oxygen" />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
        <Link to="/">Reservar una clase</Link>
        <a href="#" onClick={(e) => { e.preventDefault(); salir(); }}>Cerrar sesión</a>
      </div>
    </div>
  );
}

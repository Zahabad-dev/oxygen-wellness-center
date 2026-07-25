import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/apiClient.js';
import ClienteQrCard from '../components/ClienteQrCard.jsx';

export default function ClientPortal() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [reclamando, setReclamando] = useState(false);
  const [mensajeRecompensa, setMensajeRecompensa] = useState('');

  useEffect(() => {
    apiGet('/portal/me')
      .then(setDatos)
      .catch(() => navigate('/mi-cuenta/login', { replace: true }));
  }, [navigate]);

  async function salir() {
    await apiPost('/portal/logout', {});
    navigate('/', { replace: true });
  }

  async function reclamar() {
    setReclamando(true);
    try {
      const data = await apiPost('/portal/reclamar-recompensa', {});
      setMensajeRecompensa(`¡Felicidades! Muéstrale esto a recepción para aplicar tu recompensa: ${data.descripcion}`);
      const actualizado = await apiGet('/portal/me');
      setDatos(actualizado);
    } catch (err) {
      setMensajeRecompensa(err.message);
    } finally {
      setReclamando(false);
    }
  }

  if (error) return <div className="page"><div className="alert error">{error}</div></div>;
  if (!datos) return <div className="page-loading">Cargando…</div>;

  const { recompensa } = datos;

  return (
    <div className="page" style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      <span className="eyebrow">Mi cuenta</span>
      <ClienteQrCard qrToken={datos.qrToken} heading="Tu identificación en Oxigen" />

      {recompensa && (
        <div className="card" style={{ marginTop: 16, textAlign: 'left' }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Recompensa por lealtad</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 8px' }}>
            Llevas {recompensa.clasesEnCiclo}/{recompensa.clasesRequeridas} clases desde tu última recompensa
            {recompensa.recompensasReclamadas > 0 ? ` · ${recompensa.recompensasReclamadas} recompensas obtenidas` : ''}.
          </p>
          <div className="progress" style={{ marginBottom: 10 }}>
            <span style={{ width: `${Math.min(100, Math.round((recompensa.clasesEnCiclo / recompensa.clasesRequeridas) * 100))}%` }} />
          </div>
          {mensajeRecompensa && <div className="alert success" style={{ fontSize: 13 }}>{mensajeRecompensa}</div>}
          <button
            className="btn btn-primary btn-block"
            disabled={!recompensa.disponible || reclamando}
            onClick={reclamar}
          >
            {reclamando ? 'Reclamando…' : 'Reclamar recompensa'}
          </button>
        </div>
      )}

      {datos.historialClases?.length > 0 && (
        <div className="card" style={{ marginTop: 16, textAlign: 'left' }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Historial de clases</h3>
          <table className="responsive">
            <thead><tr><th>Fecha</th><th>Hora</th><th>Disciplina</th><th>Coach</th></tr></thead>
            <tbody>
              {datos.historialClases.map((h) => (
                <tr key={h.checkin_id}>
                  <td data-label="Fecha">{h.fecha}</td>
                  <td data-label="Hora">{h.hora_inicio?.slice(0, 5)}</td>
                  <td data-label="Disciplina">{h.disciplina_nombre}</td>
                  <td data-label="Coach">{h.coach_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
        <Link to="/">Reservar una clase</Link>
        <a href="#" onClick={(e) => { e.preventDefault(); salir(); }}>Cerrar sesión</a>
      </div>
    </div>
  );
}

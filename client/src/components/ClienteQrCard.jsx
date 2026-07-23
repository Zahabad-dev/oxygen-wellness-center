import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../lib/apiClient.js';

// Compartido entre la pantalla de "reserva confirmada" y "mi QR" — ambas muestran
// el mismo dato (identidad + QR permanente + próximas reservas), solo cambia el encabezado.
export default function ClienteQrCard({ qrToken, heading }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/clientes/${qrToken}/resumen`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [qrToken]);

  const qrUrl = `/api/clientes/${qrToken}/qr.png`;

  const compartir = useCallback(async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const file = new File([blob], 'oxygen-wellness-qr.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Mi QR — Oxygen Wellness Center',
          text: 'Este es mi código de identificación en Oxygen Wellness Center.',
        });
        return;
      }
    } catch {
      // el usuario canceló el share o el navegador no lo soporta — caemos a descargar
    }
    descargar();
  }, [qrUrl]);

  const descargar = useCallback(() => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = 'oxygen-wellness-qr.png';
    a.click();
  }, [qrUrl]);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="page-loading">Cargando…</div>;

  return (
    <div className="qr-box">
      <span className="eyebrow">{heading}</span>
      <h2>{data.nombre}</h2>
      <img src={qrUrl} alt="Código QR de identificación" />
      <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 13.5 }}>
        Este código es tuyo para siempre — úsalo para hacer check-in en cada clase.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={compartir}>Compartir</button>
        <button className="btn btn-secondary" onClick={descargar}>Descargar</button>
      </div>

      {data.proximasReservas?.length > 0 && (
        <div style={{ width: '100%', textAlign: 'left', marginTop: 10 }}>
          <h3 style={{ fontSize: 14 }}>Próximas reservas</h3>
          <table>
            <thead>
              <tr><th>Fecha</th><th>Hora</th><th>Disciplina</th><th>Coach</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {data.proximasReservas.map((r) => (
                <tr key={r.reserva_id}>
                  <td>{r.fecha}</td>
                  <td>{r.hora_inicio}</td>
                  <td>{r.disciplina_nombre}</td>
                  <td>{r.coach_nombre}</td>
                  <td>
                    {r.estado === 'confirmada' ? (
                      <span className="pill success">confirmada</span>
                    ) : (
                      <span className="pill warning">lista de espera Nº{r.posicion_espera}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <a href={`/mi-qr/${qrToken}`} style={{ fontSize: 12.5 }}>Guarda este enlace para volver a ver tu QR</a>
    </div>
  );
}

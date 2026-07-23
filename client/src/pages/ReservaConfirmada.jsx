import { useParams, useLocation, Link } from 'react-router-dom';
import ClienteQrCard from '../components/ClienteQrCard.jsx';

export default function ReservaConfirmada() {
  const { qrToken } = useParams();
  const { state } = useLocation();

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      {state?.estado === 'lista_espera' ? (
        <div className="alert warning">
          Estás en la lista de espera (posición Nº{state.posicionEspera}). Te avisaremos si se libera un lugar.
        </div>
      ) : (
        <div className="alert success">¡Reserva confirmada! Guarda este QR — es tuyo para siempre.</div>
      )}
      <ClienteQrCard qrToken={qrToken} heading="Tu identificación en Oxygen" />
      <p style={{ marginTop: 16 }}>
        <Link to="/">Reservar otra clase</Link>
      </p>
    </div>
  );
}

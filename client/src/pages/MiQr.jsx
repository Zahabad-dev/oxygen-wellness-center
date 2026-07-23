import { useParams, Link } from 'react-router-dom';
import ClienteQrCard from '../components/ClienteQrCard.jsx';

export default function MiQr() {
  const { qrToken } = useParams();
  return (
    <div className="page" style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      <ClienteQrCard qrToken={qrToken} heading="Tu código Oxygen" />
      <p style={{ marginTop: 16 }}>
        <Link to="/">Reservar una clase</Link>
      </p>
    </div>
  );
}

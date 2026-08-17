import { useEffect, useState } from 'react';
import { apiGet } from './apiClient.js';

// Detecta si hay sesión activa en el portal (cookie oxigen_client) sin redirigir si no la
// hay — se usa para saltar el formulario de nombre/whatsapp al reservar cuando el cliente
// ya está identificado, en vez de siempre pedírselo de nuevo y arriesgar crear un cliente
// duplicado si lo llena distinto a como se registró.
export function useSesionCliente() {
  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiGet('/portal/me')
      .then((data) => setCliente({ nombre: data.nombre, qrToken: data.qrToken }))
      .catch(() => setCliente(null))
      .finally(() => setCargando(false));
  }, []);

  return { cliente, cargando };
}

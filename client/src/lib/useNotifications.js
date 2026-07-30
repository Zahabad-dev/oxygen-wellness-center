import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from './apiClient.js';

// Buzón de notificaciones con sondeo periódico — sirve tanto para staff (/staff)
// como para el portal de cliente (/portal), cada uno con su propio endpoint.
export function useNotifications(baseEndpoint, intervalMs = 30000) {
  const [items, setItems] = useState([]);
  const [nuevo, setNuevo] = useState(null);
  const ultimoIdRef = useRef(null);
  const primeraCargaRef = useRef(true);

  useEffect(() => {
    let activo = true;
    function cargar() {
      apiGet(`${baseEndpoint}/notificaciones`)
        .then((data) => {
          if (!activo) return;
          if (!primeraCargaRef.current && data[0] && data[0].id !== ultimoIdRef.current) {
            setNuevo(data[0]);
          }
          if (data[0]) ultimoIdRef.current = data[0].id;
          primeraCargaRef.current = false;
          setItems(data);
        })
        .catch(() => {});
    }
    cargar();
    const id = setInterval(cargar, intervalMs);
    return () => { activo = false; clearInterval(id); };
  }, [baseEndpoint, intervalMs]);

  async function marcarLeida(id) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    try { await apiPost(`${baseEndpoint}/notificaciones/${id}/leida`, {}); } catch { /* ignore */ }
  }

  function limpiarNuevo() { setNuevo(null); }

  const noLeidas = items.filter((n) => !n.leida).length;
  return { items, noLeidas, nuevo, marcarLeida, limpiarNuevo };
}

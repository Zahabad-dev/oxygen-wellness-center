import { Router } from 'express';
import { withTransaction } from '../db.js';

export const reservasRouter = Router();

const whatsappRegex = /^[0-9+()\s-]{7,20}$/;

reservasRouter.post('/', async (req, res) => {
  const { claseId, nombre, whatsapp, email } = req.body || {};

  if (!claseId || !nombre?.trim() || !whatsapp?.trim()) {
    return res.status(400).json({ error: 'Faltan datos: nombre, whatsapp y clase son obligatorios.' });
  }
  if (!whatsappRegex.test(whatsapp.trim())) {
    return res.status(400).json({ error: 'El número de WhatsApp no parece válido.' });
  }

  try {
    const resultado = await withTransaction(async (client) => {
      // Bloquea la fila de la clase para serializar reservas concurrentes sobre el mismo cupo.
      const { rows: claseRows } = await client.query(
        `SELECT id, capacidad_maxima, estado FROM clases WHERE id = $1 FOR UPDATE`,
        [claseId]
      );
      const clase = claseRows[0];
      if (!clase) {
        const err = new Error('Clase no encontrada.');
        err.status = 404;
        throw err;
      }
      if (clase.estado !== 'programada') {
        const err = new Error('Esta clase ya no está disponible para reservar.');
        err.status = 409;
        throw err;
      }

      let { rows: clienteRows } = await client.query(
        `SELECT id, nombre, qr_token FROM clientes WHERE whatsapp = $1`,
        [whatsapp.trim()]
      );
      let cliente = clienteRows[0];
      if (!cliente) {
        const inserted = await client.query(
          `INSERT INTO clientes (nombre, whatsapp, email) VALUES ($1, $2, $3)
           RETURNING id, nombre, qr_token`,
          [nombre.trim(), whatsapp.trim(), email?.trim() || null]
        );
        cliente = inserted.rows[0];
      }

      const { rows: existentes } = await client.query(
        `SELECT id, estado FROM reservas WHERE clase_id = $1 AND cliente_id = $2`,
        [claseId, cliente.id]
      );
      if (existentes[0]) {
        const err = new Error('Ya tienes una reserva para esta clase.');
        err.status = 409;
        err.reserva = existentes[0];
        throw err;
      }

      const { rows: confirmadasRows } = await client.query(
        `SELECT count(*)::int AS n FROM reservas WHERE clase_id = $1 AND estado = 'confirmada'`,
        [claseId]
      );
      const hayCupo = confirmadasRows[0].n < clase.capacidad_maxima;

      let posicionEspera = null;
      let estado = 'confirmada';
      if (!hayCupo) {
        estado = 'lista_espera';
        const { rows: esperaRows } = await client.query(
          `SELECT count(*)::int AS n FROM reservas WHERE clase_id = $1 AND estado = 'lista_espera'`,
          [claseId]
        );
        posicionEspera = esperaRows[0].n + 1;
      }

      const { rows: reservaRows } = await client.query(
        `INSERT INTO reservas (clase_id, cliente_id, estado, posicion_espera, origen)
         VALUES ($1, $2, $3, $4, 'web')
         RETURNING id, estado, posicion_espera`,
        [claseId, cliente.id, estado, posicionEspera]
      );

      await client.query(
        `INSERT INTO historial (entidad, entidad_id, accion, actor_tipo, detalle)
         VALUES ('reserva', $1, $2, 'cliente', $3::jsonb)`,
        [
          reservaRows[0].id,
          estado === 'confirmada' ? 'reserva_confirmada' : 'reserva_lista_espera',
          JSON.stringify({ claseId, clienteId: cliente.id }),
        ]
      );

      return { cliente, reserva: reservaRows[0] };
    });

    res.status(201).json({
      estado: resultado.reserva.estado,
      posicionEspera: resultado.reserva.posicion_espera,
      cliente: { nombre: resultado.cliente.nombre, qrToken: resultado.cliente.qr_token },
    });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[reservas] Error inesperado:', err);
    res.status(status).json({ error: err.message || 'Error al crear la reserva.' });
  }
});

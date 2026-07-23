import { Router } from 'express';
import { query } from '../db.js';
import { generarQrPng } from '../qr.js';
import { asyncHandler } from '../asyncHandler.js';

// Rutas públicas keyed por qr_token (UUID) — el token ES la credencial, igual que un enlace
// secreto de calendario. No exponemos nada por un id secuencial adivinable.
export const clientesRouter = Router();

clientesRouter.get('/:qrToken/resumen', asyncHandler(async (req, res) => {
  const { rows: clienteRows } = await query(
    `SELECT id, nombre, qr_token FROM clientes WHERE qr_token = $1`,
    [req.params.qrToken]
  );
  const cliente = clienteRows[0];
  if (!cliente) return res.status(404).json({ error: 'Código QR no reconocido.' });

  const { rows: proximas } = await query(
    `SELECT r.id AS reserva_id, r.estado, r.posicion_espera,
            c.fecha, c.hora_inicio, c.duracion_minutos,
            d.nombre AS disciplina_nombre, d.color AS disciplina_color,
            co.nombre AS coach_nombre
     FROM reservas r
     JOIN clases c ON c.id = r.clase_id
     JOIN disciplinas d ON d.id = c.disciplina_id
     JOIN coaches co ON co.id = c.coach_id
     WHERE r.cliente_id = $1 AND r.estado IN ('confirmada','lista_espera') AND c.fecha >= CURRENT_DATE
     ORDER BY c.fecha, c.hora_inicio`,
    [cliente.id]
  );

  res.json({ nombre: cliente.nombre, qrToken: cliente.qr_token, proximasReservas: proximas });
}));

clientesRouter.get('/:qrToken/qr.png', asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT 1 FROM clientes WHERE qr_token = $1`, [req.params.qrToken]);
  if (!rows[0]) return res.status(404).end();
  const png = await generarQrPng(req.params.qrToken);
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'private, max-age=31536000, immutable');
  res.send(png);
}));

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from './config.js';
import { query } from './db.js';
import { asyncHandler } from './asyncHandler.js';

// Portal del cliente: login opcional con WhatsApp + contraseña. El QR sigue siendo
// la identidad para check-in — esto es un canal aparte para que el cliente vea su
// cuenta sin depender del link. Cookie propia, distinta a la de staff.

const cookieOpts = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSecure ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export function requireClienteAuth(req, res, next) {
  const token = req.cookies?.[config.clientCookieName];
  if (!token) return res.status(401).json({ error: 'No has iniciado sesión.' });
  try {
    req.cliente = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

export const portalRouter = Router();

portalRouter.post('/login', asyncHandler(async (req, res) => {
  const { whatsapp, password } = req.body || {};
  if (!whatsapp?.trim() || !password) {
    return res.status(400).json({ error: 'Falta WhatsApp o contraseña.' });
  }

  const { rows } = await query(
    `SELECT id, nombre, qr_token, password_hash FROM clientes WHERE whatsapp = $1`,
    [whatsapp.trim()]
  );
  const cliente = rows[0];
  if (!cliente || !cliente.password_hash) {
    return res.status(401).json({ error: 'No tienes una cuenta todavía — pídele a recepción que te la active.' });
  }

  const ok = await bcrypt.compare(password, cliente.password_hash);
  if (!ok) return res.status(401).json({ error: 'WhatsApp o contraseña incorrectos.' });

  const payload = { id: cliente.id, nombre: cliente.nombre, qrToken: cliente.qr_token };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });
  res.cookie(config.clientCookieName, token, cookieOpts);
  res.json({ cliente: payload });
}));

portalRouter.get('/me', requireClienteAuth, asyncHandler(async (req, res) => {
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
    [req.cliente.id]
  );
  res.json({ nombre: req.cliente.nombre, qrToken: req.cliente.qrToken, proximasReservas: proximas });
}));

portalRouter.post('/logout', (_req, res) => {
  res.clearCookie(config.clientCookieName, { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

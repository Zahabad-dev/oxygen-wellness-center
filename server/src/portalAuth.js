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

// Progreso de la recompensa por lealtad: cuenta clases tomadas (checkins) desde la última
// vez que este cliente reclamó, contra la regla activa (tipo 'lealtad_clases').
async function calcularRecompensa(clienteId) {
  const { rows: promoRows } = await query(
    `SELECT id, reglas, beneficio FROM promociones WHERE tipo = 'lealtad_clases' AND activo = true LIMIT 1`
  );
  const promo = promoRows[0];
  if (!promo) return null;

  const clasesRequeridas = promo.reglas?.clases_requeridas ?? 10;
  const descripcion = promo.beneficio?.descripcion ?? '';

  const { rows: ultimaRows } = await query(
    `SELECT fecha FROM redenciones WHERE promocion_id = $1 AND cliente_id = $2 ORDER BY fecha DESC LIMIT 1`,
    [promo.id, clienteId]
  );
  const desde = ultimaRows[0]?.fecha ?? '-infinity';

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS n FROM checkins WHERE cliente_id = $1 AND created_at > $2`,
    [clienteId, desde]
  );
  const { rows: totalRows } = await query(
    `SELECT count(*)::int AS n FROM redenciones WHERE promocion_id = $1 AND cliente_id = $2`,
    [promo.id, clienteId]
  );

  return {
    promocionId: promo.id,
    clasesEnCiclo: countRows[0].n,
    clasesRequeridas,
    descripcion,
    disponible: countRows[0].n >= clasesRequeridas,
    recompensasReclamadas: totalRows[0].n,
  };
}

portalRouter.post('/login', asyncHandler(async (req, res) => {
  const { whatsapp, password } = req.body || {};
  if (!whatsapp?.trim() || !password) {
    return res.status(400).json({ error: 'Falta WhatsApp o contraseña.' });
  }

  // Un mismo whatsapp puede pertenecer a varios perfiles (familia compartiendo teléfono),
  // así que se prueba la contraseña contra cada uno hasta encontrar el que corresponde.
  const { rows } = await query(
    `SELECT id, nombre, qr_token, password_hash FROM clientes WHERE whatsapp = $1 AND password_hash IS NOT NULL`,
    [whatsapp.trim()]
  );
  if (!rows.length) {
    return res.status(401).json({ error: 'No tienes una cuenta todavía — pídele a recepción que te la active.' });
  }

  let cliente = null;
  for (const fila of rows) {
    if (await bcrypt.compare(password, fila.password_hash)) {
      cliente = fila;
      break;
    }
  }
  if (!cliente) return res.status(401).json({ error: 'WhatsApp o contraseña incorrectos.' });

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

  const { rows: historial } = await query(
    `SELECT ch.id AS checkin_id, ch.created_at,
            c.fecha, c.hora_inicio,
            d.nombre AS disciplina_nombre, d.color AS disciplina_color,
            co.nombre AS coach_nombre
     FROM checkins ch
     JOIN reservas r ON r.id = ch.reserva_id
     JOIN clases c ON c.id = r.clase_id
     JOIN disciplinas d ON d.id = c.disciplina_id
     JOIN coaches co ON co.id = c.coach_id
     WHERE ch.cliente_id = $1
     ORDER BY ch.created_at DESC
     LIMIT 20`,
    [req.cliente.id]
  );

  const recompensa = await calcularRecompensa(req.cliente.id);

  res.json({ nombre: req.cliente.nombre, qrToken: req.cliente.qrToken, proximasReservas: proximas, historialClases: historial, recompensa });
}));

portalRouter.post('/reclamar-recompensa', requireClienteAuth, asyncHandler(async (req, res) => {
  const estado = await calcularRecompensa(req.cliente.id);
  if (!estado || !estado.disponible) {
    return res.status(409).json({ error: 'Todavía no completas las clases necesarias para tu recompensa.' });
  }
  await query(
    `INSERT INTO redenciones (promocion_id, cliente_id) VALUES ($1, $2)`,
    [estado.promocionId, req.cliente.id]
  );
  res.json({ ok: true, descripcion: estado.descripcion });
}));

portalRouter.post('/logout', (_req, res) => {
  res.clearCookie(config.clientCookieName, { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

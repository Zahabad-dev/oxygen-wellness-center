import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from './config.js';
import { query, withTransaction } from './db.js';
import { asyncHandler } from './asyncHandler.js';

const whatsappRegex = /^[0-9+()\s-]{7,20}$/;

// Portal del cliente: login opcional con WhatsApp + contraseña. El QR sigue siendo
// la identidad para check-in — esto es un canal aparte para que el cliente vea su
// cuenta sin depender del link. Cookie propia, distinta a la de staff.

// Sesión de larga duración a propósito: el cliente no debe tener que volver a iniciar
// sesión — el portal solo expone sus propios datos de bajo riesgo (QR, reservas,
// historial), sin pagos en línea ni datos de otros clientes.
const SESION_DURACION_MS = 10 * 365 * 24 * 60 * 60 * 1000; // ~10 años

const cookieOpts = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSecure ? 'none' : 'lax',
  maxAge: SESION_DURACION_MS,
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

// Saldo de clases de membresía: suma movimientos_saldo (compra = positivo, consumo = negativo)
// que no hayan expirado. Si hay un pago pendiente de esa membresía, se avisa aparte.
async function calcularMembresia(clienteId) {
  const { rows: saldoRows } = await query(
    `SELECT COALESCE(SUM(cantidad), 0)::int AS saldo
     FROM movimientos_saldo
     WHERE cliente_id = $1 AND (fecha_expiracion IS NULL OR fecha_expiracion >= CURRENT_DATE)`,
    [clienteId]
  );
  const { rows: pendienteRows } = await query(
    `SELECT p.id, m.nombre AS membresia_nombre
     FROM pagos p
     JOIN suscripciones s ON s.id = p.referencia_id AND p.referencia_tipo = 'membresia'
     JOIN membresias m ON m.id = s.membresia_id
     WHERE s.cliente_id = $1 AND p.estado = 'pendiente'
     ORDER BY p.fecha DESC LIMIT 1`,
    [clienteId]
  );
  return {
    saldo: saldoRows[0].saldo,
    pagoPendiente: pendienteRows[0] || null,
  };
}

portalRouter.get('/membresias', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, nombre, clases_incluidas, precio, vigencia_dias FROM membresias WHERE activo = true ORDER BY clases_incluidas`
  );
  res.json(rows);
}));

// Autoregistro + compra de membresía: misma identidad cliente que una reserva normal
// (whatsapp + nombre), pero además define su propia contraseña de portal (nadie de
// staff se la crea) y arranca con 1 clase de cortesía mientras se confirma el pago
// en persona — el resto del saldo se libera cuando recepción/admin marca "pagado".
portalRouter.post('/registrar-membresia', asyncHandler(async (req, res) => {
  const { nombre, whatsapp, email, membresiaId, password } = req.body || {};
  if (!nombre?.trim() || !whatsapp?.trim() || !membresiaId) {
    return res.status(400).json({ error: 'Nombre, WhatsApp y membresía son obligatorios.' });
  }
  if (!whatsappRegex.test(whatsapp.trim())) {
    return res.status(400).json({ error: 'El número de WhatsApp no parece válido.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
  }

  const resultado = await withTransaction(async (client) => {
    const { rows: membresiaRows } = await client.query(
      `SELECT id, nombre, clases_incluidas, precio, vigencia_dias FROM membresias WHERE id = $1 AND activo = true`,
      [membresiaId]
    );
    const membresia = membresiaRows[0];
    if (!membresia) {
      const err = new Error('Esa membresía ya no está disponible.');
      err.status = 404;
      throw err;
    }

    let { rows: clienteRows } = await client.query(
      `SELECT id, nombre, qr_token FROM clientes WHERE whatsapp = $1 AND lower(nombre) = lower($2)`,
      [whatsapp.trim(), nombre.trim()]
    );
    let cliente = clienteRows[0];
    const hash = await bcrypt.hash(password, 10);
    if (!cliente) {
      const inserted = await client.query(
        `INSERT INTO clientes (nombre, whatsapp, email, password_hash) VALUES ($1, $2, $3, $4)
         RETURNING id, nombre, qr_token`,
        [nombre.trim(), whatsapp.trim(), email?.trim() || null, hash]
      );
      cliente = inserted.rows[0];
    } else {
      await client.query(`UPDATE clientes SET password_hash = $1 WHERE id = $2`, [hash, cliente.id]);
    }

    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + membresia.vigencia_dias);
    const { rows: suscripcionRows } = await client.query(
      `INSERT INTO suscripciones (cliente_id, membresia_id, fecha_inicio, fecha_fin, estado)
       VALUES ($1, $2, CURRENT_DATE, $3, 'activa') RETURNING id`,
      [cliente.id, membresia.id, fechaFin.toISOString().slice(0, 10)]
    );
    const suscripcionId = suscripcionRows[0].id;

    await client.query(
      `INSERT INTO pagos (cliente_id, concepto, referencia_tipo, referencia_id, monto, metodo, estado)
       VALUES ($1, $2, 'membresia', $3, $4, 'efectivo', 'pendiente')`,
      [cliente.id, `Membresía ${membresia.nombre}`, suscripcionId, membresia.precio]
    );

    const cortesia = Math.min(1, membresia.clases_incluidas);
    await client.query(
      `INSERT INTO movimientos_saldo (cliente_id, tipo, cantidad, referencia_tipo, referencia_id, fecha_expiracion)
       VALUES ($1, 'compra', $2, 'paquete', $3, $4)`,
      [cliente.id, cortesia, suscripcionId, fechaFin.toISOString().slice(0, 10)]
    );

    await client.query(
      `INSERT INTO historial (entidad, entidad_id, accion, actor_tipo, detalle)
       VALUES ('suscripcion', $1, 'membresia_registrada', 'cliente', $2::jsonb)`,
      [suscripcionId, JSON.stringify({ clienteId: cliente.id, membresiaId: membresia.id })]
    );

    return { cliente };
  });

  const payload = { id: resultado.cliente.id, nombre: resultado.cliente.nombre, qrToken: resultado.cliente.qr_token };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: SESION_DURACION_MS / 1000 });
  res.cookie(config.clientCookieName, token, cookieOpts);
  res.status(201).json({ cliente: payload });
}));

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
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: SESION_DURACION_MS / 1000 });
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
  const membresia = await calcularMembresia(req.cliente.id);

  res.json({ nombre: req.cliente.nombre, qrToken: req.cliente.qrToken, proximasReservas: proximas, historialClases: historial, recompensa, membresia });
}));

portalRouter.get('/notificaciones', requireClienteAuth, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, tipo, titulo, mensaje, leida, created_at FROM notificaciones
     WHERE destinatario_tipo = 'cliente' AND destinatario_id = $1
     ORDER BY created_at DESC LIMIT 30`,
    [req.cliente.id]
  );
  res.json(rows);
}));

portalRouter.post('/notificaciones/:id/leida', requireClienteAuth, asyncHandler(async (req, res) => {
  await query(
    `UPDATE notificaciones SET leida = true WHERE id = $1 AND destinatario_tipo = 'cliente' AND destinatario_id = $2`,
    [req.params.id, req.cliente.id]
  );
  res.json({ ok: true });
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

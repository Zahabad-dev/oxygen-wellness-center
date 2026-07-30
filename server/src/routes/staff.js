import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { asyncHandler } from '../asyncHandler.js';

export const staffRouter = Router();

// ---------- Notificaciones (buzón propio de cada cuenta de staff) ----------
staffRouter.get('/notificaciones', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, tipo, titulo, mensaje, leida, created_at FROM notificaciones
     WHERE destinatario_tipo = 'staff' AND destinatario_id = $1
     ORDER BY created_at DESC LIMIT 30`,
    [req.staff.id]
  );
  res.json(rows);
}));

staffRouter.post('/notificaciones/:id/leida', asyncHandler(async (req, res) => {
  await query(
    `UPDATE notificaciones SET leida = true WHERE id = $1 AND destinatario_tipo = 'staff' AND destinatario_id = $2`,
    [req.params.id, req.staff.id]
  );
  res.json({ ok: true });
}));

// ---------- Membresías pendientes de confirmar pago (recepción/admin) ----------
staffRouter.get('/pagos-pendientes', asyncHandler(async (req, res) => {
  if (!['administrador', 'recepcion'].includes(req.staff.rol)) {
    return res.status(403).json({ error: 'No tienes permiso para ver esto.' });
  }
  const { rows } = await query(
    `SELECT p.id AS pago_id, p.monto, p.fecha, p.referencia_id AS suscripcion_id,
            cl.id AS cliente_id, cl.nombre AS cliente_nombre, cl.whatsapp,
            m.nombre AS membresia_nombre, m.clases_incluidas
     FROM pagos p
     JOIN suscripciones s ON s.id = p.referencia_id AND p.referencia_tipo = 'membresia'
     JOIN clientes cl ON cl.id = s.cliente_id
     JOIN membresias m ON m.id = s.membresia_id
     WHERE p.estado = 'pendiente'
     ORDER BY p.fecha`
  );
  res.json(rows);
}));

staffRouter.post('/pagos/:id/confirmar', asyncHandler(async (req, res) => {
  if (!['administrador', 'recepcion'].includes(req.staff.rol)) {
    return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
  }

  await withTransaction(async (client) => {
    const { rows: pagoRows } = await client.query(
      `SELECT p.id, p.estado, p.referencia_id AS suscripcion_id
       FROM pagos p WHERE p.id = $1 AND p.referencia_tipo = 'membresia' FOR UPDATE`,
      [req.params.id]
    );
    const pago = pagoRows[0];
    if (!pago) {
      const err = new Error('Pago no encontrado.');
      err.status = 404;
      throw err;
    }
    if (pago.estado === 'pagado') return;

    const { rows: suscripcionRows } = await client.query(
      `SELECT s.cliente_id, s.fecha_fin, m.clases_incluidas
       FROM suscripciones s JOIN membresias m ON m.id = s.membresia_id
       WHERE s.id = $1`,
      [pago.suscripcion_id]
    );
    const suscripcion = suscripcionRows[0];

    // Ya se otorgó 1 clase de cortesía al registrarse — aquí se libera el resto.
    const restante = Math.max(0, suscripcion.clases_incluidas - 1);
    if (restante > 0) {
      await client.query(
        `INSERT INTO movimientos_saldo (cliente_id, tipo, cantidad, referencia_tipo, referencia_id, fecha_expiracion)
         VALUES ($1, 'compra', $2, 'paquete', $3, $4)`,
        [suscripcion.cliente_id, restante, pago.suscripcion_id, suscripcion.fecha_fin]
      );
    }

    await client.query(`UPDATE pagos SET estado = 'pagado' WHERE id = $1`, [pago.id]);
    await client.query(
      `INSERT INTO historial (entidad, entidad_id, accion, actor_tipo, actor_id, detalle)
       VALUES ('pago', $1, 'pago_confirmado', 'staff', $2, $3::jsonb)`,
      [pago.id, req.staff.id, JSON.stringify({ suscripcionId: pago.suscripcion_id })]
    );
  });

  res.json({ ok: true });
}));

// ---------- Agenda de hoy (recepción ve todo; coach solo lo suyo) ----------
staffRouter.get('/agenda-hoy', asyncHandler(async (req, res) => {
  const soloCoach = req.staff.rol === 'coach';
  const params = [];
  let filtroCoach = '';
  if (soloCoach) {
    params.push(req.staff.coachId);
    filtroCoach = `AND c.coach_id = $${params.length}`;
  }

  const { rows } = await query(
    `SELECT
       c.id, c.fecha, c.hora_inicio, c.duracion_minutos, c.capacidad_maxima, c.nivel,
       d.nombre AS disciplina_nombre, d.color AS disciplina_color,
       co.nombre AS coach_nombre, s.nombre AS salon_nombre,
       COALESCE(
         json_agg(
           json_build_object(
             'reservaId', r.id, 'clienteId', cl.id, 'nombre', cl.nombre, 'whatsapp', cl.whatsapp,
             'estado', r.estado, 'posicionEspera', r.posicion_espera
           ) ORDER BY r.creado_en
         ) FILTER (WHERE r.id IS NOT NULL), '[]'
       ) AS roster
     FROM clases c
     JOIN disciplinas d ON d.id = c.disciplina_id
     JOIN coaches co ON co.id = c.coach_id
     JOIN salones s ON s.id = c.salon_id
     LEFT JOIN reservas r ON r.clase_id = c.id AND r.estado IN ('confirmada','lista_espera','asistio')
     LEFT JOIN clientes cl ON cl.id = r.cliente_id
     WHERE c.fecha = CURRENT_DATE ${filtroCoach}
     GROUP BY c.id, d.nombre, d.color, co.nombre, s.nombre
     ORDER BY c.hora_inicio`,
    params
  );

  res.json(rows);
}));

// ---------- Seguimiento a clientes nuevos: reservas confirmadas que arrancan en <= 2h,
// de clientes que reservan por primera vez (recepción y admin, para recordarles avisar por WhatsApp) ----------
staffRouter.get('/seguimientos', asyncHandler(async (req, res) => {
  if (!['administrador', 'recepcion'].includes(req.staff.rol)) {
    return res.status(403).json({ error: 'No tienes permiso para ver esto.' });
  }

  const { rows } = await query(
    `SELECT r.id AS reserva_id, cl.id AS cliente_id, cl.nombre, cl.whatsapp,
            c.fecha, c.hora_inicio, d.nombre AS disciplina_nombre
     FROM reservas r
     JOIN clases c ON c.id = r.clase_id
     JOIN clientes cl ON cl.id = r.cliente_id
     JOIN disciplinas d ON d.id = c.disciplina_id
     WHERE r.estado = 'confirmada'
       AND (c.fecha + c.hora_inicio) BETWEEN now() AND now() + interval '2 hours'
       AND (SELECT count(*) FROM reservas r2 WHERE r2.cliente_id = cl.id) = 1
     ORDER BY c.fecha, c.hora_inicio`
  );
  res.json(rows);
}));

// ---------- Clientes: lista + buscador (recepción y admin) ----------
staffRouter.get('/clientes', asyncHandler(async (req, res) => {
  const buscar = (req.query.buscar || '').trim();
  const params = [];
  let filtro = '';
  if (buscar) {
    params.push(`%${buscar}%`);
    filtro = `WHERE cl.nombre ILIKE $${params.length} OR cl.whatsapp ILIKE $${params.length}`;
  }

  const { rows } = await query(
    `SELECT cl.id, cl.nombre, cl.whatsapp, cl.email, cl.qr_token, cl.created_at,
            (cl.password_hash IS NOT NULL) AS tiene_acceso,
            COALESCE(r.n, 0)::int AS reservas_total,
            COALESCE(a.n, 0)::int AS clases_tomadas,
            r.ultima_fecha
     FROM clientes cl
     LEFT JOIN (
       SELECT cliente_id, count(*) AS n, max(creado_en) AS ultima_fecha
       FROM reservas GROUP BY cliente_id
     ) r ON r.cliente_id = cl.id
     LEFT JOIN (
       SELECT cliente_id, count(*) AS n
       FROM checkins GROUP BY cliente_id
     ) a ON a.cliente_id = cl.id
     ${filtro}
     ORDER BY cl.created_at DESC
     LIMIT 50`,
    params
  );
  res.json(rows);
}));

// ---------- Crear acceso al portal para un cliente (nombre/whatsapp ya conocidos) ----------
staffRouter.post('/clientes/:id/crear-acceso', asyncHandler(async (req, res) => {
  if (!['administrador', 'recepcion'].includes(req.staff.rol)) {
    return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
  }
  const { password } = req.body || {};
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `UPDATE clientes SET password_hash = $1 WHERE id = $2 RETURNING nombre, whatsapp`,
    [hash, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado.' });
  res.json({ ok: true, nombre: rows[0].nombre, whatsapp: rows[0].whatsapp });
}));

// ---------- Check-in (solo recepción/admin — el coach solo puede ver su agenda) ----------
staffRouter.post('/checkin', async (req, res) => {
  if (req.staff.rol === 'coach') {
    return res.status(403).json({ error: 'Tu cuenta no tiene permiso para registrar check-in.' });
  }
  const { qrToken, claseId, forzar } = req.body || {};
  if (!qrToken || !claseId) {
    return res.status(400).json({ error: 'Falta el QR o la clase.' });
  }

  try {
    const resultado = await withTransaction(async (client) => {
      const { rows: clienteRows } = await client.query(
        `SELECT id, nombre FROM clientes WHERE qr_token = $1`,
        [qrToken]
      );
      const cliente = clienteRows[0];
      if (!cliente) {
        const err = new Error('Código QR no reconocido.');
        err.status = 404;
        throw err;
      }

      const { rows: claseRows } = await client.query(
        `SELECT id, fecha, hora_inicio, capacidad_maxima FROM clases WHERE id = $1 FOR UPDATE`,
        [claseId]
      );
      const clase = claseRows[0];
      if (!clase) {
        const err = new Error('Clase no encontrada.');
        err.status = 404;
        throw err;
      }

      const { rows: cfgRows } = await client.query(
        `SELECT clave, valor FROM configuracion_general
         WHERE clave IN ('ventana_checkin_minutos_antes','ventana_checkin_minutos_despues')`
      );
      const cfg = Object.fromEntries(cfgRows.map((r) => [r.clave, Number(r.valor)]));
      const inicio = new Date(`${clase.fecha}T${clase.hora_inicio}`);
      const ahora = new Date();
      const minutosDesdeInicio = (ahora - inicio) / 60000;
      const dentroVentana =
        minutosDesdeInicio >= -(cfg.ventana_checkin_minutos_antes ?? 15) &&
        minutosDesdeInicio <= (cfg.ventana_checkin_minutos_despues ?? 15);

      if (!dentroVentana && !forzar) {
        const err = new Error('Fuera del horario de check-in para esta clase. ¿Registrar de todas formas?');
        err.status = 409;
        err.advertencia = 'fuera_de_ventana';
        throw err;
      }

      const { rows: reservaRows } = await client.query(
        `SELECT id, estado FROM reservas WHERE clase_id = $1 AND cliente_id = $2`,
        [claseId, cliente.id]
      );
      let reserva = reservaRows[0];

      if (reserva?.estado === 'asistio') {
        const err = new Error(`${cliente.nombre} ya tiene registrada su asistencia a esta clase.`);
        err.status = 409;
        throw err;
      }

      if (reserva?.estado === 'lista_espera') {
        const err = new Error(`${cliente.nombre} está en lista de espera, no tiene lugar confirmado todavía.`);
        err.status = 409;
        throw err;
      }

      if (!reserva) {
        const { rows: confirmadasRows } = await client.query(
          `SELECT count(*)::int AS n FROM reservas WHERE clase_id = $1 AND estado = 'confirmada'`,
          [claseId]
        );
        if (confirmadasRows[0].n >= clase.capacidad_maxima) {
          const err = new Error('No tiene reserva y la clase ya está llena.');
          err.status = 409;
          throw err;
        }
        const inserted = await client.query(
          `INSERT INTO reservas (clase_id, cliente_id, estado, origen) VALUES ($1, $2, 'confirmada', 'recepcion')
           RETURNING id, estado`,
          [claseId, cliente.id]
        );
        reserva = inserted.rows[0];
      }

      await client.query(`UPDATE reservas SET estado = 'asistio' WHERE id = $1`, [reserva.id]);

      const validaciones = { dentroVentana, forzado: Boolean(forzar) };
      await client.query(
        `INSERT INTO checkins (reserva_id, cliente_id, metodo, validaciones) VALUES ($1, $2, 'qr', $3::jsonb)`,
        [reserva.id, cliente.id, JSON.stringify(validaciones)]
      );

      await client.query(
        `INSERT INTO historial (entidad, entidad_id, accion, actor_tipo, actor_id, detalle)
         VALUES ('checkin', $1, 'checkin_registrado', 'staff', $2, $3::jsonb)`,
        [reserva.id, req.staff.id, JSON.stringify({ claseId, clienteId: cliente.id, ...validaciones })]
      );

      return { nombre: cliente.nombre };
    });

    res.json({ ok: true, nombre: resultado.nombre });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[staff/checkin] Error inesperado:', err);
    res.status(status).json({ error: err.message || 'Error al registrar el check-in.', advertencia: err.advertencia });
  }
});

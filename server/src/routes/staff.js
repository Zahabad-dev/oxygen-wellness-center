import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { asyncHandler } from '../asyncHandler.js';

export const staffRouter = Router();

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
            r.ultima_fecha
     FROM clientes cl
     LEFT JOIN (
       SELECT cliente_id, count(*) AS n, max(creado_en) AS ultima_fecha
       FROM reservas GROUP BY cliente_id
     ) r ON r.cliente_id = cl.id
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

// ---------- Check-in ----------
staffRouter.post('/checkin', async (req, res) => {
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

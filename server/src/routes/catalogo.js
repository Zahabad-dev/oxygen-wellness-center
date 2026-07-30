import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../asyncHandler.js';

export const catalogoRouter = Router();

catalogoRouter.get('/disciplinas', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, nombre, color, descripcion FROM disciplinas WHERE activo = true ORDER BY nombre`
  );
  res.json(rows);
}));

catalogoRouter.get('/membresias', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, nombre, clases_incluidas, precio, vigencia_dias
     FROM membresias WHERE activo = true ORDER BY clases_incluidas`
  );
  res.json(rows);
}));

catalogoRouter.get('/destacados', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, titulo, subtitulo, fechas, imagen_url, whatsapp, mensaje
     FROM destacados WHERE activo = true ORDER BY orden, id`
  );
  res.json(rows);
}));

catalogoRouter.get('/coaches', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT co.id, co.nombre, co.bio, co.foto_url,
       COALESCE(array_agg(d.nombre ORDER BY d.nombre) FILTER (WHERE d.id IS NOT NULL), '{}') AS disciplinas
     FROM coaches co
     LEFT JOIN coach_disciplinas cd ON cd.coach_id = co.id
     LEFT JOIN disciplinas d ON d.id = cd.disciplina_id AND d.activo = true
     WHERE co.activo = true
     GROUP BY co.id
     ORDER BY co.nombre`
  );
  res.json(rows);
}));

catalogoRouter.get('/clases', asyncHandler(async (req, res) => {
  const { disciplina, coach, fecha, hasta, nivel } = req.query;
  const clauses = [`c.estado = 'programada'`, `c.fecha >= CURRENT_DATE`];
  const values = [];

  if (disciplina) {
    values.push(disciplina);
    clauses.push(`d.id = $${values.length}`);
  }
  if (coach) {
    values.push(coach);
    clauses.push(`co.id = $${values.length}`);
  }
  if (fecha) {
    values.push(fecha);
    clauses.push(`c.fecha = $${values.length}`);
  } else if (hasta) {
    values.push(hasta);
    clauses.push(`c.fecha <= $${values.length}`);
  }
  if (nivel) {
    values.push(nivel);
    clauses.push(`c.nivel = $${values.length}`);
  }

  const { rows } = await query(
    `SELECT
       c.id, c.fecha, c.hora_inicio, c.duracion_minutos, c.capacidad_maxima, c.nivel, c.descripcion,
       d.id AS disciplina_id, d.nombre AS disciplina_nombre, d.color AS disciplina_color,
       co.id AS coach_id, co.nombre AS coach_nombre,
       s.nombre AS salon_nombre,
       COALESCE((SELECT count(*) FROM reservas r WHERE r.clase_id = c.id AND r.estado = 'confirmada'), 0)::int AS confirmadas
     FROM clases c
     JOIN disciplinas d ON d.id = c.disciplina_id
     JOIN coaches co ON co.id = c.coach_id
     JOIN salones s ON s.id = c.salon_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY c.fecha, c.hora_inicio`,
    values
  );

  res.json(
    rows.map((r) => ({ ...r, cupoDisponible: Math.max(r.capacidad_maxima - r.confirmadas, 0) }))
  );
}));

catalogoRouter.get('/clases/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT
       c.id, c.fecha, c.hora_inicio, c.duracion_minutos, c.capacidad_maxima, c.nivel, c.descripcion, c.estado,
       d.id AS disciplina_id, d.nombre AS disciplina_nombre, d.color AS disciplina_color,
       co.id AS coach_id, co.nombre AS coach_nombre, co.bio AS coach_bio,
       s.nombre AS salon_nombre,
       COALESCE((SELECT count(*) FROM reservas r WHERE r.clase_id = c.id AND r.estado = 'confirmada'), 0)::int AS confirmadas
     FROM clases c
     JOIN disciplinas d ON d.id = c.disciplina_id
     JOIN coaches co ON co.id = c.coach_id
     JOIN salones s ON s.id = c.salon_id
     WHERE c.id = $1`,
    [req.params.id]
  );
  const clase = rows[0];
  if (!clase) return res.status(404).json({ error: 'Clase no encontrada' });
  res.json({ ...clase, cupoDisponible: Math.max(clase.capacidad_maxima - clase.confirmadas, 0) });
}));

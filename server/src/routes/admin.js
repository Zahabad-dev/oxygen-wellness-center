import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { asyncHandler } from '../asyncHandler.js';

export const adminRouter = Router();

// ---------- Salones (solo lectura por ahora — se crean vía seed/SQL) ----------
adminRouter.get('/salones', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT s.id, s.nombre, s.capacidad_maxima, s.sucursal_id
     FROM salones s WHERE s.activo = true ORDER BY s.nombre`
  );
  res.json(rows);
}));

// ---------- Coaches ----------
adminRouter.get('/coaches', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.nombre, c.bio, c.foto_url, c.activo,
            COALESCE(json_agg(json_build_object('id', d.id, 'nombre', d.nombre)) FILTER (WHERE d.id IS NOT NULL), '[]') AS disciplinas
     FROM coaches c
     LEFT JOIN coach_disciplinas cd ON cd.coach_id = c.id
     LEFT JOIN disciplinas d ON d.id = cd.disciplina_id
     GROUP BY c.id
     ORDER BY c.nombre`
  );
  res.json(rows);
}));

adminRouter.post('/coaches', asyncHandler(async (req, res) => {
  const { nombre, bio, fotoUrl, disciplinaIds = [] } = req.body || {};
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio.' });

  const resultado = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO coaches (nombre, bio, foto_url) VALUES ($1, $2, $3) RETURNING id`,
      [nombre.trim(), bio || null, fotoUrl || null]
    );
    const coachId = rows[0].id;
    for (const discId of disciplinaIds) {
      await client.query(
        `INSERT INTO coach_disciplinas (coach_id, disciplina_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [coachId, discId]
      );
    }
    return coachId;
  });

  res.status(201).json({ id: resultado });
}));

adminRouter.put('/coaches/:id', asyncHandler(async (req, res) => {
  const { nombre, bio, fotoUrl, activo, disciplinaIds } = req.body || {};

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE coaches SET nombre = COALESCE($1, nombre), bio = $2, foto_url = $3, activo = COALESCE($4, activo)
       WHERE id = $5`,
      [nombre?.trim() || null, bio || null, fotoUrl || null, activo, req.params.id]
    );
    if (Array.isArray(disciplinaIds)) {
      await client.query(`DELETE FROM coach_disciplinas WHERE coach_id = $1`, [req.params.id]);
      for (const discId of disciplinaIds) {
        await client.query(
          `INSERT INTO coach_disciplinas (coach_id, disciplina_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [req.params.id, discId]
        );
      }
    }
  });

  res.json({ ok: true });
}));

adminRouter.delete('/coaches/:id', asyncHandler(async (req, res) => {
  await query(`UPDATE coaches SET activo = false WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
}));

// ---------- Clases ----------
adminRouter.get('/clases', asyncHandler(async (req, res) => {
  const { desde } = req.query;
  const { rows } = await query(
    `SELECT c.id, c.fecha, c.hora_inicio, c.duracion_minutos, c.capacidad_maxima, c.nivel, c.descripcion, c.estado,
            d.id AS disciplina_id, d.nombre AS disciplina_nombre, d.color AS disciplina_color,
            co.id AS coach_id, co.nombre AS coach_nombre,
            s.id AS salon_id, s.nombre AS salon_nombre
     FROM clases c
     JOIN disciplinas d ON d.id = c.disciplina_id
     JOIN coaches co ON co.id = c.coach_id
     JOIN salones s ON s.id = c.salon_id
     WHERE c.fecha >= COALESCE($1, CURRENT_DATE - INTERVAL '7 days')
     ORDER BY c.fecha, c.hora_inicio`,
    [desde || null]
  );
  res.json(rows);
}));

adminRouter.post('/clases', asyncHandler(async (req, res) => {
  const { disciplinaId, coachId, salonId, fecha, horaInicio, duracionMinutos, capacidadMaxima, nivel, descripcion } = req.body || {};
  if (!disciplinaId || !coachId || !salonId || !fecha || !horaInicio || !capacidadMaxima) {
    return res.status(400).json({ error: 'Faltan datos obligatorios de la clase.' });
  }

  const { rows } = await query(
    `INSERT INTO clases (disciplina_id, coach_id, salon_id, fecha, hora_inicio, duracion_minutos, capacidad_maxima, nivel, descripcion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [disciplinaId, coachId, salonId, fecha, horaInicio, duracionMinutos || 50, capacidadMaxima, nivel || null, descripcion || null]
  );

  res.status(201).json({ id: rows[0].id });
}));

adminRouter.put('/clases/:id', asyncHandler(async (req, res) => {
  const { disciplinaId, coachId, salonId, fecha, horaInicio, duracionMinutos, capacidadMaxima, nivel, descripcion, estado } = req.body || {};

  const { rows } = await query(
    `UPDATE clases SET
       disciplina_id = COALESCE($1, disciplina_id),
       coach_id = COALESCE($2, coach_id),
       salon_id = COALESCE($3, salon_id),
       fecha = COALESCE($4, fecha),
       hora_inicio = COALESCE($5, hora_inicio),
       duracion_minutos = COALESCE($6, duracion_minutos),
       capacidad_maxima = COALESCE($7, capacidad_maxima),
       nivel = COALESCE($8, nivel),
       descripcion = COALESCE($9, descripcion),
       estado = COALESCE($10, estado)
     WHERE id = $11
     RETURNING id`,
    [disciplinaId, coachId, salonId, fecha, horaInicio, duracionMinutos, capacidadMaxima, nivel, descripcion, estado, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Clase no encontrada.' });
  res.json({ ok: true });
}));

adminRouter.delete('/clases/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT count(*)::int AS n FROM reservas WHERE clase_id = $1`, [req.params.id]);
  if (rows[0].n > 0) {
    return res.status(409).json({ error: 'Esta clase ya tiene reservas — cancélala en vez de borrarla.' });
  }
  await query(`DELETE FROM clases WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
}));

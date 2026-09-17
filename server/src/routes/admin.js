import { Router } from 'express';
import bcrypt from 'bcryptjs';
import config from '../config.js';
import { query, withTransaction } from '../db.js';
import { asyncHandler } from '../asyncHandler.js';
import { uploadImage } from '../uploads.js';
import { parseCumple } from '../cumpleanos.js';

const ROLES_VALIDOS = ['administrador', 'recepcion', 'coach'];

export const adminRouter = Router();

// ---------- Subida de fotos (hero, coaches, disciplinas) a un volumen persistente del servidor ----------
adminRouter.post('/uploads', (req, res) => {
  uploadImage.single('imagen')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'No se pudo subir la imagen.' });
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo de imagen.' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// ---------- Destacados: eventos/talleres especiales del carrusel del landing ----------
adminRouter.get('/destacados', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, titulo, subtitulo, fechas, imagen_url, whatsapp, mensaje, orden, activo
     FROM destacados ORDER BY orden, id`
  );
  res.json(rows);
}));

adminRouter.post('/destacados', asyncHandler(async (req, res) => {
  const { titulo, subtitulo, fechas, imagenUrl, whatsapp, mensaje, orden, activo } = req.body || {};
  if (!titulo?.trim()) return res.status(400).json({ error: 'El título es obligatorio.' });
  if (!imagenUrl?.trim()) return res.status(400).json({ error: 'La imagen es obligatoria.' });

  const { rows } = await query(
    `INSERT INTO destacados (titulo, subtitulo, fechas, imagen_url, whatsapp, mensaje, orden, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [titulo.trim(), subtitulo?.trim() || null, fechas?.trim() || null, imagenUrl.trim(),
     whatsapp?.trim() || null, mensaje?.trim() || null, Number(orden) || 0, activo !== false]
  );
  res.status(201).json({ id: rows[0].id });
}));

adminRouter.put('/destacados/:id', asyncHandler(async (req, res) => {
  const { titulo, subtitulo, fechas, imagenUrl, whatsapp, mensaje, orden, activo } = req.body || {};
  if (!titulo?.trim()) return res.status(400).json({ error: 'El título es obligatorio.' });
  if (!imagenUrl?.trim()) return res.status(400).json({ error: 'La imagen es obligatoria.' });

  await query(
    `UPDATE destacados
     SET titulo = $1, subtitulo = $2, fechas = $3, imagen_url = $4, whatsapp = $5, mensaje = $6, orden = $7, activo = $8
     WHERE id = $9`,
    [titulo.trim(), subtitulo?.trim() || null, fechas?.trim() || null, imagenUrl.trim(),
     whatsapp?.trim() || null, mensaje?.trim() || null, Number(orden) || 0, activo !== false, req.params.id]
  );
  res.json({ ok: true });
}));

adminRouter.delete('/destacados/:id', asyncHandler(async (req, res) => {
  await query(`DELETE FROM destacados WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
}));

// ---------- Contenido del sitio: hero (foto/título) — guardado en configuracion_general ----------
const HERO_DEFAULT = {
  imagenUrl: '/images/hero-image.png',
  titulo: 'Wellness Studio',
  subtitulo: 'Respira, Reconecta y Fluye.',
  ctaTexto: 'Reservar',
};

adminRouter.get('/contenido/hero', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT valor FROM configuracion_general WHERE clave = 'sitio_hero'`);
  res.json({ ...HERO_DEFAULT, ...(rows[0]?.valor || {}) });
}));

adminRouter.put('/contenido/hero', asyncHandler(async (req, res) => {
  const { imagenUrl, titulo, subtitulo, ctaTexto } = req.body || {};
  if (!imagenUrl?.trim() || !titulo?.trim()) {
    return res.status(400).json({ error: 'La imagen y el título son obligatorios.' });
  }
  const valor = {
    imagenUrl: imagenUrl.trim(),
    titulo: titulo.trim(),
    subtitulo: subtitulo?.trim() || '',
    ctaTexto: ctaTexto?.trim() || 'Reservar',
  };
  await query(
    `INSERT INTO configuracion_general (clave, valor, descripcion)
     VALUES ('sitio_hero', $1::jsonb, 'Foto y texto del hero del landing')
     ON CONFLICT (clave) DO UPDATE SET valor = $1::jsonb`,
    [JSON.stringify(valor)]
  );
  res.json(valor);
}));

// ---------- Contenido del sitio: actividad especial del mes (reemplaza la sección "Comunidad" fija) ----------
const ACTIVIDAD_MES_DEFAULT = {
  activo: false,
  imagenUrl: '',
  titulo: '',
  dia: '',
  hora: '',
  descripcion: '',
  whatsapp: '',
  mensaje: '',
  ctaTexto: 'Reservar mi lugar',
};

adminRouter.get('/contenido/actividad-mes', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT valor FROM configuracion_general WHERE clave = 'sitio_actividad_mes'`);
  res.json({ ...ACTIVIDAD_MES_DEFAULT, ...(rows[0]?.valor || {}) });
}));

adminRouter.put('/contenido/actividad-mes', asyncHandler(async (req, res) => {
  const { activo, imagenUrl, titulo, dia, hora, descripcion, whatsapp, mensaje, ctaTexto } = req.body || {};
  if (activo && (!imagenUrl?.trim() || !titulo?.trim())) {
    return res.status(400).json({ error: 'Para activarla, la imagen y el título son obligatorios.' });
  }
  const valor = {
    activo: Boolean(activo),
    imagenUrl: imagenUrl?.trim() || '',
    titulo: titulo?.trim() || '',
    dia: dia?.trim() || '',
    hora: hora?.trim() || '',
    descripcion: descripcion?.trim() || '',
    whatsapp: whatsapp?.trim() || '',
    mensaje: mensaje?.trim() || '',
    ctaTexto: ctaTexto?.trim() || 'Reservar mi lugar',
  };
  await query(
    `INSERT INTO configuracion_general (clave, valor, descripcion)
     VALUES ('sitio_actividad_mes', $1::jsonb, 'Actividad especial del mes que reemplaza la seccion Comunidad del landing')
     ON CONFLICT (clave) DO UPDATE SET valor = $1::jsonb`,
    [JSON.stringify(valor)]
  );
  res.json(valor);
}));

// ---------- Disciplinas: color y foto que se muestran en el landing (nombre/orden son fijos) ----------
adminRouter.get('/disciplinas', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, nombre, color, descripcion, imagen_url, activo FROM disciplinas ORDER BY nombre`
  );
  res.json(rows);
}));

adminRouter.put('/disciplinas/:id', asyncHandler(async (req, res) => {
  const { color, descripcion, imagenUrl, activo } = req.body || {};
  const { rows } = await query(
    `UPDATE disciplinas SET
       color = COALESCE($1, color),
       descripcion = $2,
       imagen_url = $3,
       activo = COALESCE($4, activo)
     WHERE id = $5
     RETURNING id`,
    [color || null, descripcion?.trim() || null, imagenUrl?.trim() || null, activo, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Disciplina no encontrada.' });
  res.json({ ok: true });
}));

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
            s.id AS salon_id, s.nombre AS salon_nombre,
            COALESCE((SELECT count(*) FROM reservas r WHERE r.clase_id = c.id AND r.estado = 'confirmada'), 0)::int AS confirmadas,
            COALESCE((SELECT count(*) FROM reservas r WHERE r.clase_id = c.id AND r.estado = 'lista_espera'), 0)::int AS en_espera
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

// ---------- Roster de una clase: quién la reservó (para el detalle en Admin > Clases) ----------
adminRouter.get('/clases/:id/reservas', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.id AS reserva_id, r.estado, r.posicion_espera, r.creado_en, r.origen,
            cl.id AS cliente_id, cl.nombre, cl.whatsapp,
            (SELECT ch.id FROM checkins ch WHERE ch.reserva_id = r.id) IS NOT NULL AS asistio
     FROM reservas r
     JOIN clientes cl ON cl.id = r.cliente_id
     WHERE r.clase_id = $1
     ORDER BY (r.estado = 'confirmada') DESC, r.creado_en`,
    [req.params.id]
  );
  res.json(rows);
}));

// ---------- Corregir asistencia a mano (recepción olvidó pasar el QR, o lo marcó por error) ----------
adminRouter.put('/reservas/:id/asistencia', asyncHandler(async (req, res) => {
  const { asistio } = req.body || {};
  const { rows } = await query(`SELECT id, cliente_id, estado FROM reservas WHERE id = $1`, [req.params.id]);
  const reserva = rows[0];
  if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });

  await withTransaction(async (client) => {
    if (asistio) {
      const { rows: existe } = await client.query(`SELECT id FROM checkins WHERE reserva_id = $1`, [req.params.id]);
      if (!existe[0]) {
        await client.query(
          `INSERT INTO checkins (reserva_id, cliente_id, metodo, validaciones) VALUES ($1, $2, 'manual', '{"editado_por_admin": true}'::jsonb)`,
          [req.params.id, reserva.cliente_id]
        );
      }
      await client.query(`UPDATE reservas SET estado = 'asistio' WHERE id = $1`, [req.params.id]);
    } else {
      await client.query(`DELETE FROM checkins WHERE reserva_id = $1`, [req.params.id]);
      await client.query(`UPDATE reservas SET estado = 'confirmada' WHERE id = $1 AND estado = 'asistio'`, [req.params.id]);
    }
    await client.query(
      `INSERT INTO historial (entidad, entidad_id, accion, actor_tipo, actor_id, detalle)
       VALUES ('reserva', $1, $2, 'staff', $3, $4::jsonb)`,
      [req.params.id, asistio ? 'asistencia_marcada_manual' : 'asistencia_quitada_manual', req.staff.id, JSON.stringify({ clienteId: reserva.cliente_id })]
    );
  });

  res.json({ ok: true });
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

// ---------- Usuarios de staff (solo administrador — ya lo bloquea el middleware del router) ----------
adminRouter.get('/usuarios', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.email, u.activo, r.nombre AS rol, u.coach_id, co.nombre AS coach_nombre
     FROM usuarios_internos u
     JOIN roles r ON r.id = u.rol_id
     LEFT JOIN coaches co ON co.id = u.coach_id
     ORDER BY u.nombre`
  );
  res.json(rows);
}));

adminRouter.post('/usuarios', asyncHandler(async (req, res) => {
  const { nombre, email, password, rol, coachId } = req.body || {};
  if (!nombre?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido.' });
  }
  if (rol === 'coach' && !coachId) {
    return res.status(400).json({ error: 'Selecciona a qué coach corresponde esta cuenta.' });
  }

  const { rows: rolRows } = await query(`SELECT id FROM roles WHERE nombre = $1`, [rol]);
  const hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await query(
      `INSERT INTO usuarios_internos (nombre, email, password_hash, rol_id, coach_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nombre.trim(), email.trim().toLowerCase(), hash, rolRows[0].id, rol === 'coach' ? coachId : null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
    }
    throw err;
  }
}));

adminRouter.put('/usuarios/:id', asyncHandler(async (req, res) => {
  const { nombre, email, rol, coachId, activo, password } = req.body || {};

  let rolId = null;
  if (rol) {
    if (!ROLES_VALIDOS.includes(rol)) return res.status(400).json({ error: 'Rol inválido.' });
    const { rows: rolRows } = await query(`SELECT id FROM roles WHERE nombre = $1`, [rol]);
    rolId = rolRows[0].id;
  }
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  try {
    const { rows } = await query(
      `UPDATE usuarios_internos SET
         nombre = COALESCE($1, nombre),
         email = COALESCE($2, email),
         rol_id = COALESCE($3, rol_id),
         coach_id = CASE WHEN $4::text = 'coach' THEN $5 ELSE (CASE WHEN $4::text IS NOT NULL THEN NULL ELSE coach_id END) END,
         activo = COALESCE($6, activo),
         password_hash = COALESCE($7, password_hash)
       WHERE id = $8
       RETURNING id`,
      [nombre?.trim() || null, email?.trim().toLowerCase() || null, rolId, rol || null, coachId || null, activo, passwordHash, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe otro usuario con ese correo.' });
    }
    throw err;
  }
}));

adminRouter.delete('/usuarios/:id', asyncHandler(async (req, res) => {
  if (config.clientDataManagementEnabled) {
    await query(`DELETE FROM usuarios_internos WHERE id = $1`, [req.params.id]);
    return res.json({ ok: true, eliminado: true });
  }
  await query(`UPDATE usuarios_internos SET activo = false WHERE id = $1`, [req.params.id]);
  res.json({ ok: true, eliminado: false });
}));

// ---------- Clientes: edicion y borrado completo (gateado por config.clientDataManagementEnabled) ----------
adminRouter.get('/clientes/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, nombre, whatsapp, email, notas_internas, estado, consentimiento_marketing, qr_token, created_at,
            cumple_mes, cumple_dia
     FROM clientes WHERE id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado.' });
  res.json(rows[0]);
}));

adminRouter.put('/clientes/:id', asyncHandler(async (req, res) => {
  if (!config.clientDataManagementEnabled) {
    return res.status(403).json({ error: 'La edición completa de clientes está deshabilitada.' });
  }
  const { nombre, whatsapp, email, notasInternas, estado, consentimientoMarketing, cumpleMes, cumpleDia } = req.body || {};
  const cumple = parseCumple(cumpleMes, cumpleDia);
  if (cumple.error) return res.status(400).json({ error: cumple.error });

  try {
    const { rows } = await query(
      `UPDATE clientes SET
         nombre = COALESCE($1, nombre),
         whatsapp = COALESCE($2, whatsapp),
         email = $3,
         notas_internas = $4,
         estado = COALESCE($5, estado),
         consentimiento_marketing = COALESCE($6, consentimiento_marketing),
         cumple_mes = $7,
         cumple_dia = $8
       WHERE id = $9
       RETURNING id`,
      [nombre?.trim() || null, whatsapp?.trim() || null, email || null, notasInternas || null, estado || null, consentimientoMarketing, cumple.mes, cumple.dia, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe otro cliente con ese WhatsApp.' });
    }
    throw err;
  }
}));

adminRouter.delete('/clientes/:id', asyncHandler(async (req, res) => {
  if (!config.clientDataManagementEnabled) {
    return res.status(403).json({ error: 'El borrado de clientes está deshabilitado.' });
  }
  await query(`DELETE FROM clientes WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
}));

// ---------- Fusionar dos perfiles de cliente duplicados en uno solo ----------
// Mueve reservas/checkins/pagos/etc. del que se borra hacia el que se conserva, completa
// los datos del que se conserva con lo que le falte, y borra el duplicado. Pensado para
// casos como "María" y "Maria" (mismo WhatsApp) o el mismo WhatsApp escrito con un dígito
// mal (typo) bajo el mismo nombre — el admin decide cuál de los dos es el bueno.
adminRouter.post('/clientes/:mantenerId/fusionar', asyncHandler(async (req, res) => {
  const { mantenerId } = req.params;
  const { eliminarId } = req.body || {};
  if (!eliminarId) return res.status(400).json({ error: 'Falta el cliente a fusionar.' });
  if (String(eliminarId) === String(mantenerId)) {
    return res.status(400).json({ error: 'No puedes fusionar un cliente consigo mismo.' });
  }

  const resultado = await withTransaction(async (client) => {
    const { rows: clientesRows } = await client.query(
      `SELECT id, email, notas_internas, password_hash, cumple_mes, cumple_dia, nombre
       FROM clientes WHERE id IN ($1, $2) FOR UPDATE`,
      [mantenerId, eliminarId]
    );
    const mantener = clientesRows.find((c) => String(c.id) === String(mantenerId));
    const eliminar = clientesRows.find((c) => String(c.id) === String(eliminarId));
    if (!mantener || !eliminar) {
      const err = new Error('No se encontró alguno de los dos clientes.');
      err.status = 404;
      throw err;
    }

    // Reservas: evita chocar con la restricción UNIQUE(clase_id, cliente_id) si ambos
    // perfiles alcanzaron a reservar la misma clase por separado — esas se descartan.
    await client.query(
      `UPDATE reservas SET cliente_id = $1
       WHERE cliente_id = $2
         AND NOT EXISTS (SELECT 1 FROM reservas r2 WHERE r2.clase_id = reservas.clase_id AND r2.cliente_id = $1)`,
      [mantenerId, eliminarId]
    );
    await client.query(`DELETE FROM reservas WHERE cliente_id = $1`, [eliminarId]);

    await client.query(`UPDATE checkins SET cliente_id = $1 WHERE cliente_id = $2`, [mantenerId, eliminarId]);
    await client.query(`UPDATE suscripciones SET cliente_id = $1 WHERE cliente_id = $2`, [mantenerId, eliminarId]);
    await client.query(`UPDATE movimientos_saldo SET cliente_id = $1 WHERE cliente_id = $2`, [mantenerId, eliminarId]);
    await client.query(`UPDATE pagos SET cliente_id = $1 WHERE cliente_id = $2`, [mantenerId, eliminarId]);
    await client.query(`UPDATE redenciones SET cliente_id = $1 WHERE cliente_id = $2`, [mantenerId, eliminarId]);
    await client.query(
      `UPDATE notificaciones SET destinatario_id = $1 WHERE destinatario_tipo = 'cliente' AND destinatario_id = $2`,
      [mantenerId, eliminarId]
    );
    await client.query(
      `UPDATE historial SET actor_id = $1 WHERE actor_tipo = 'cliente' AND actor_id = $2`,
      [mantenerId, eliminarId]
    );

    await client.query(
      `UPDATE clientes SET
         email = COALESCE(email, $2),
         notas_internas = COALESCE(notas_internas, $3),
         password_hash = COALESCE(password_hash, $4),
         cumple_mes = COALESCE(cumple_mes, $5),
         cumple_dia = COALESCE(cumple_dia, $6)
       WHERE id = $1`,
      [mantenerId, eliminar.email, eliminar.notas_internas, eliminar.password_hash, eliminar.cumple_mes, eliminar.cumple_dia]
    );

    await client.query(`DELETE FROM clientes WHERE id = $1`, [eliminarId]);

    return { nombre: mantener.nombre };
  });

  res.json({ ok: true, nombre: resultado.nombre });
}));

// ---------- Recompensa por lealtad: una sola regla editable (cada N clases → una recompensa) ----------
adminRouter.get('/recompensa', asyncHandler(async (_req, res) => {
  let { rows } = await query(
    `SELECT id, reglas, beneficio, activo FROM promociones WHERE tipo = 'lealtad_clases' LIMIT 1`
  );
  if (!rows[0]) {
    const inserted = await query(
      `INSERT INTO promociones (nombre, tipo, reglas, beneficio, activo)
       VALUES ('Recompensa por lealtad', 'lealtad_clases', '{"clases_requeridas": 10}'::jsonb, '{"descripcion": "10% de descuento en tu siguiente clase"}'::jsonb, true)
       RETURNING id, reglas, beneficio, activo`
    );
    rows = inserted.rows;
  }
  const p = rows[0];
  res.json({
    id: p.id,
    clasesRequeridas: p.reglas?.clases_requeridas ?? 10,
    descripcion: p.beneficio?.descripcion ?? '',
    activo: p.activo,
  });
}));

adminRouter.put('/recompensa', asyncHandler(async (req, res) => {
  const { clasesRequeridas, descripcion, activo } = req.body || {};
  const n = Number(clasesRequeridas);
  if (!Number.isInteger(n) || n < 1) {
    return res.status(400).json({ error: 'El número de clases debe ser un entero mayor a 0.' });
  }
  if (!descripcion?.trim()) {
    return res.status(400).json({ error: 'Describe la recompensa.' });
  }

  const { rows } = await query(
    `UPDATE promociones
     SET reglas = jsonb_build_object('clases_requeridas', $1::int),
         beneficio = jsonb_build_object('descripcion', $2::text),
         activo = $3
     WHERE tipo = 'lealtad_clases'
     RETURNING id, reglas, beneficio, activo`,
    [n, descripcion.trim(), activo !== false]
  );
  if (!rows[0]) return res.status(404).json({ error: 'No existe la regla de recompensa — recarga la página.' });
  const p = rows[0];
  res.json({ id: p.id, clasesRequeridas: p.reglas.clases_requeridas, descripcion: p.beneficio.descripcion, activo: p.activo });
}));

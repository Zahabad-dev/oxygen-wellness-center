-- Oxygen Wellness Center — datos semilla para poder probar el flujo completo
-- Ejecutar después de 01_schema.sql y 02_usuarios.sql.

-- Roles y permisos base
INSERT INTO roles (nombre) VALUES ('administrador'), ('recepcion'), ('coach')
  ON CONFLICT (nombre) DO NOTHING;

INSERT INTO permisos (codigo, descripcion) VALUES
  ('catalogo.ver', 'Ver catálogo de clases'),
  ('reservas.gestionar', 'Reservar, mover y cancelar a nombre de un cliente'),
  ('checkin.registrar', 'Escanear QR y registrar asistencia'),
  ('clientes.gestionar', 'Ver y editar fichas de clientes'),
  ('catalogo.gestionar', 'Crear/editar disciplinas, coaches, salones, clases'),
  ('comercial.gestionar', 'Membresías, paquetes, pagos, promociones'),
  ('usuarios.gestionar', 'Usuarios, roles y configuración general'),
  ('dashboard.ver', 'Ver dashboard de KPIs')
  ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'administrador'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'recepcion'
  AND p.codigo IN ('catalogo.ver','reservas.gestionar','checkin.registrar','clientes.gestionar')
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'coach'
  AND p.codigo IN ('catalogo.ver','checkin.registrar')
ON CONFLICT DO NOTHING;

-- Disciplinas del brief, cada una con su color propio (leyenda del documento de diseño)
INSERT INTO disciplinas (nombre, color, descripcion) VALUES
  ('Functional Training', '#B0653F', 'Entrenamiento funcional de fuerza y acondicionamiento.'),
  ('Pilates', '#7A5C7E', 'Control, postura y fuerza del core.'),
  ('Yoga', '#5E7D5A', 'Movimiento, respiración y calma.'),
  ('Barre', '#B4707C', 'Tonificación de bajo impacto inspirada en el ballet.'),
  ('Mobility', '#5C7A96', 'Movilidad articular y rango de movimiento.'),
  ('Stretching', '#A98B2E', 'Flexibilidad y recuperación activa.'),
  ('HIIT', '#A8433A', 'Intervalos de alta intensidad.'),
  ('Meditación', '#4A5A82', 'Respiración y enfoque mental.')
ON CONFLICT (nombre) DO NOTHING;

-- Sucursal y salón placeholder (listos para una segunda sucursal en el futuro sin rediseño)
INSERT INTO sucursales (nombre, direccion)
VALUES ('Oxygen Wellness Center — Principal', 'Por confirmar con la clienta')
ON CONFLICT DO NOTHING;

INSERT INTO salones (sucursal_id, nombre, capacidad_maxima)
SELECT id, 'Salón A', 12 FROM sucursales WHERE nombre = 'Oxygen Wellness Center — Principal'
ON CONFLICT DO NOTHING;

-- Coach demo
INSERT INTO coaches (nombre, bio) VALUES ('Coach Demo', 'Coach de ejemplo para probar el flujo de reserva.');

INSERT INTO coach_disciplinas (coach_id, disciplina_id)
SELECT c.id, d.id FROM coaches c, disciplinas d
WHERE c.nombre = 'Coach Demo' AND d.nombre IN ('Yoga', 'Functional Training');

-- Clase demo de hoy, a una hora fácil de encontrar al probar
INSERT INTO clases (disciplina_id, coach_id, salon_id, fecha, hora_inicio, duracion_minutos, capacidad_maxima, nivel, descripcion)
SELECT d.id, c.id, s.id, CURRENT_DATE, '09:00', 50, 10, 'Todos los niveles', 'Clase de demostración para probar el flujo de reserva.'
FROM disciplinas d, coaches c, salones s
WHERE d.nombre = 'Yoga' AND c.nombre = 'Coach Demo' AND s.nombre = 'Salón A';

-- Configuración general — reglas de negocio con valores por defecto (editables después desde Admin)
INSERT INTO configuracion_general (clave, valor, descripcion) VALUES
  ('ventana_checkin_minutos_antes', '15', 'Minutos antes de la hora de inicio en que se permite hacer check-in.'),
  ('ventana_checkin_minutos_despues', '15', 'Minutos después de la hora de inicio en que aún se permite hacer check-in.'),
  ('ventana_cancelacion_horas', '3', 'Horas antes de la clase en que el cliente puede cancelar sin penalización.'),
  ('tiempo_limite_lista_espera_minutos', '15', 'Minutos que tiene el siguiente en la fila para confirmar cuando se libera un lugar.')
ON CONFLICT (clave) DO NOTHING;

-- Usuario admin de desarrollo. Password: "OxygenAdmin2026" — CAMBIAR antes de producción
-- (genera un hash nuevo con "npm run hash -- \"TuPassword\"" desde server/ y actualiza esta fila).
INSERT INTO usuarios_internos (nombre, email, password_hash, rol_id)
SELECT 'Administradora', 'admin@oxygenwc.com', '$2b$10$sL82nyLcrpiXmDHdeiA6/ekdgu4jo4FvE2jX4qq5k8cEutUg/DU2O',
       (SELECT id FROM roles WHERE nombre = 'administrador')
ON CONFLICT (email) DO NOTHING;

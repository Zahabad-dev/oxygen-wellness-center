// Buzón genérico de notificaciones — un solo mecanismo para avisar tanto a staff
// (ej. coach: nueva reserva) como a clientes (ej. membresía por acabarse).
export async function crearNotificacion(client, { destinatarioTipo, destinatarioId, tipo, titulo, mensaje }) {
  await client.query(
    `INSERT INTO notificaciones (destinatario_tipo, destinatario_id, tipo, titulo, mensaje)
     VALUES ($1, $2, $3, $4, $5)`,
    [destinatarioTipo, destinatarioId, tipo, titulo, mensaje]
  );
}

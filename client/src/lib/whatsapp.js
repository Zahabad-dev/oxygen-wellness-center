// Genera un link de click-to-chat de WhatsApp (wa.me) con mensaje precargado.
// Al abrirse usa el WhatsApp del propio dispositivo de quien da clic (recepción/admin),
// iniciando un chat hacia el número del cliente — el envío sigue siendo manual.
export function waLink(numero, mensaje) {
  const digits = (numero || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeSeguimiento({ nombre, disciplina_nombre, hora_inicio }) {
  const hora = hora_inicio?.slice(0, 5);
  return `¡Hola ${nombre}! 👋 Soy del equipo de Oxigen Wellness Center. Vi que tienes tu primera clase de ${disciplina_nombre} hoy a las ${hora} — ¿todo listo para venir? Cualquier duda, aquí estamos para ayudarte.`;
}

// Envuelve un handler async de Express: cualquier rechazo de promesa (ej. la DB no responde)
// se reenvía a next(err) en vez de tirar el proceso completo con un unhandled rejection.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

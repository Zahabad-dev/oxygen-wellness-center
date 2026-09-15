-- La identidad del cliente (whatsapp + nombre) antes solo ignoraba mayúsculas/minúsculas —
-- "Iliana Vázquez" y "Iliana Vazquez" (con/sin acento) se trataban como personas distintas y
-- se registraban por duplicado. Ahora también se ignoran acentos y espacios de más.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() se referencia con esquema explícito (public.unaccent) a propósito: sin calificar,
-- "CREATE UNIQUE INDEX ... (nombre_normalizado(nombre))" falla con "function unaccent(text)
-- does not exist" aunque la función se pueda llamar normal en un SELECT.
CREATE OR REPLACE FUNCTION nombre_normalizado(texto TEXT)
RETURNS TEXT AS $$
  SELECT lower(public.unaccent(trim(regexp_replace(texto, '\s+', ' ', 'g'))));
$$ LANGUAGE sql IMMUTABLE;

DROP INDEX IF EXISTS clientes_whatsapp_nombre_key;
CREATE UNIQUE INDEX clientes_whatsapp_nombre_key ON clientes (whatsapp, nombre_normalizado(nombre));

-- Cumpleaños del cliente para la recompensa de cumpleaños de la comunidad — a propósito
-- SOLO mes y día, sin año, para no dar la impresión de que se les pide su edad/fecha completa.

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cumple_mes SMALLINT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cumple_dia SMALLINT;

ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cumple_mes_check;
ALTER TABLE clientes ADD CONSTRAINT clientes_cumple_mes_check CHECK (cumple_mes IS NULL OR cumple_mes BETWEEN 1 AND 12);

ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cumple_dia_check;
ALTER TABLE clientes ADD CONSTRAINT clientes_cumple_dia_check CHECK (cumple_dia IS NULL OR cumple_dia BETWEEN 1 AND 31);

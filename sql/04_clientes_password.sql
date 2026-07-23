-- Portal del cliente: login opcional con WhatsApp + contraseña, ademas del QR.
-- El QR sigue siendo la identidad para check-in -- esto es solo para que el cliente
-- pueda entrar a ver sus reservas/QR/historial sin depender del link.

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS password_hash TEXT;

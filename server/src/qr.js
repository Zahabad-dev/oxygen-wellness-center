import QRCode from 'qrcode';

// El QR codifica solo el token (UUID) del cliente — el mismo token de siempre, permanente.
// No se regenera entre reservas; ver flujo del QR en el documento de diseño.
export function generarQrPng(qrToken) {
  return QRCode.toBuffer(qrToken, {
    type: 'png',
    width: 480,
    margin: 2,
    color: { dark: '#16241F', light: '#FFFFFF' },
  });
}

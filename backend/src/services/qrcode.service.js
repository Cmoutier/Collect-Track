const QRCode = require('qrcode');

/**
 * Génère un identifiant unique pour le QR code d'un client
 */
function genererCodeQR() {
  return `CT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

/**
 * Génère une image QR code en base64 à partir d'un code
 * @param {string} code
 * @returns {Promise<string>} data URL PNG base64
 */
async function genererImageQR(code) {
  return await QRCode.toDataURL(code, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

/**
 * Génère un buffer PNG du QR code (pour téléchargement)
 * @param {string} code
 * @returns {Promise<Buffer>}
 */
async function genererBufferQR(code) {
  return await QRCode.toBuffer(code, { width: 400, margin: 2 });
}

module.exports = { genererCodeQR, genererImageQR, genererBufferQR };

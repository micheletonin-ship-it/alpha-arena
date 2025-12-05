/**
 * Security utilities for encryption/decryption
 * Ported from services/security.ts to Node.js
 */

const SECRET_SALT = "ALPHAARENA_SECURE_KEY_X99_V1";

/**
 * Decrypt an encrypted string using XOR cipher
 * @param {string} encoded - The encrypted hex string
 * @returns {string} - The decrypted plain text
 */
const decrypt = (encoded) => {
  if (!encoded) return '';
  
  try {
    const textToChars = (text) => text.split('').map(c => c.charCodeAt(0));
    const applySaltToChar = (code) => textToChars(SECRET_SALT).reduce((a, b) => a ^ b, code);
    
    const match = encoded.match(/.{1,2}/g);
    if (!match) return '';

    return match
      .map(hex => parseInt(hex, 16))
      .map(applySaltToChar)
      .map(charCode => String.fromCharCode(charCode))
      .join('');
  } catch (e) {
    console.error('[Security] Decryption failed:', e.message);
    // Fallback: return original if starts with known prefix (unencrypted key)
    return encoded.startsWith('sk-') || encoded.startsWith('PK') ? encoded : '';
  }
};

/**
 * Encrypt a plain text string using XOR cipher
 * @param {string} text - The plain text to encrypt
 * @returns {string} - The encrypted hex string
 */
const encrypt = (text) => {
  if (!text) return '';
  
  try {
    const textToChars = (text) => text.split('').map(c => c.charCodeAt(0));
    const byteHex = (n) => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code) => textToChars(SECRET_SALT).reduce((a, b) => a ^ b, code);

    return text
      .split('')
      .map(c => c.charCodeAt(0))
      .map(applySaltToChar)
      .map(byteHex)
      .join('');
  } catch (e) {
    console.error('[Security] Encryption failed:', e.message);
    return '';
  }
};

module.exports = {
  encrypt,
  decrypt
};

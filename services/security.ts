
// A lightweight encryption utility for the POC to prevent plain-text storage.
// In a production banking app, this would be handled by a backend vault or Web Crypto API with user-derived keys.

const SECRET_SALT = "TRADEVIEW_SECURE_KEY_X99_V1";

export const encrypt = (text: string): string => {
  if (!text) return '';
  try {
      const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
      const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
      // XOR Cipher logic
      const applySaltToChar = (code: any) => textToChars(SECRET_SALT).reduce((a, b) => a ^ b, code);

      return text
        .split('')
        .map(textToChars)
        .map(applySaltToChar)
        .map(byteHex)
        .join('');
  } catch (e) {
      console.error("Encryption failed", e);
      return '';
  }
};

export const decrypt = (encoded: string): string => {
  if (!encoded) return '';
  try {
      const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
      const applySaltToChar = (code: any) => textToChars(SECRET_SALT).reduce((a, b) => a ^ b, code);
      
      const match = encoded.match(/.{1,2}/g);
      if (!match) return '';

      return match
        .map(hex => parseInt(hex, 16))
        .map(applySaltToChar)
        .map(charCode => String.fromCharCode(charCode))
        .join('');
  } catch (e) {
      // Return empty or original if decryption fails (fallback for old plain keys)
      return encoded.startsWith('PK') ? encoded : ''; 
  }
};
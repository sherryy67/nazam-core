const crypto = require('crypto');

/**
 * Generate a secure random token for payment links
 * @param {number} length - Length of the token in bytes (default: 32 = 64 hex characters)
 * @returns {string} - Hex encoded token
 */
const generatePaymentToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a shorter, URL-friendly token
 * @returns {string} - URL-safe base64 token
 */
const generateShortToken = () => {
  return crypto.randomBytes(24).toString('base64url');
};

module.exports = {
  generatePaymentToken,
  generateShortToken
};

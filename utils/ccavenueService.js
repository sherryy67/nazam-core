const crypto = require('crypto');

/**
 * CCAvenue Payment Gateway Service
 * Handles payment encryption, decryption, and payment form generation
 */
class CCAvenueService {
  constructor() {
    // CCAvenue credentials from environment variables
    this.merchantId = process.env.CCAVENUE_MERCHANT_ID || '45990';
    this.accessCode = process.env.CCAVENUE_ACCESS_CODE || 'AVYR05ML69BN93RYNB';
    this.workingKey = process.env.CCAVENUE_WORKING_KEY || '3975E51578741CE0758A7C8B148F642A';
    this.paymentUrl = process.env.CCAVENUE_PAYMENT_URL || 'https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction';
  }

  /**
   * Encrypt payment parameters using AES encryption
   * @param {string} plainText - Plain text to encrypt
   * @returns {string} - Encrypted string
   */
  encrypt(plainText) {
    try {
      // CCAvenue working key: 3975E51578741CE0758A7C8B148F642A (32 hex chars = 16 bytes)
      // Remove any whitespace and convert from hex string to buffer
      const keyHex = this.workingKey.trim().replace(/\s+/g, '');
      
      // Validate hex string format
      if (!/^[0-9A-Fa-f]{32}$/.test(keyHex)) {
        throw new Error(`Invalid working key format. Expected 32 hex characters, got: ${keyHex.length} chars`);
      }
      
      // Convert hex string to 16-byte buffer for AES-128-CBC
      const key = Buffer.from(keyHex, 'hex');
      
      if (key.length !== 16) {
        throw new Error(`Invalid key length: expected 16 bytes, got ${key.length} bytes`);
      }
      
      // Use zero IV as per CCAvenue specification
      const iv = Buffer.alloc(16, 0);
      const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption error: ${error.message}`);
    }
  }

  /**
   * Decrypt payment response using AES decryption
   * @param {string} encryptedText - Encrypted text to decrypt
   * @returns {string} - Decrypted string
   */
  decrypt(encryptedText) {
    try {
      // CCAvenue working key: 3975E51578741CE0758A7C8B148F642A (32 hex chars = 16 bytes)
      // Remove any whitespace and convert from hex string to buffer
      const keyHex = this.workingKey.trim().replace(/\s+/g, '');
      
      // Validate hex string format
      if (!/^[0-9A-Fa-f]{32}$/.test(keyHex)) {
        throw new Error(`Invalid working key format. Expected 32 hex characters, got: ${keyHex.length} chars`);
      }
      
      // Convert hex string to 16-byte buffer for AES-128-CBC
      const key = Buffer.from(keyHex, 'hex');
      
      if (key.length !== 16) {
        throw new Error(`Invalid key length: expected 16 bytes, got ${key.length} bytes`);
      }
      
      // Use zero IV as per CCAvenue specification
      const iv = Buffer.alloc(16, 0);
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption error: ${error.message}`);
    }
  }

  /**
   * Generate payment form data for CCAvenue
   * @param {Object} paymentData - Payment information
   * @param {string} paymentData.orderId - Unique order ID
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.currency - Currency code (default: AED)
   * @param {string} paymentData.redirectUrl - Success redirect URL
   * @param {string} paymentData.cancelUrl - Cancel redirect URL
   * @param {string} paymentData.customerName - Customer name
   * @param {string} paymentData.customerEmail - Customer email
   * @param {string} paymentData.customerPhone - Customer phone
   * @param {string} paymentData.billingAddress - Billing address
   * @param {string} paymentData.billingCity - Billing city
   * @param {string} paymentData.billingState - Billing state
   * @param {string} paymentData.billingZip - Billing zip code
   * @param {string} paymentData.billingCountry - Billing country
   * @returns {Object} - Payment form data with encrypted parameters
   */
  generatePaymentData(paymentData) {
    const {
      orderId,
      amount,
      currency = 'AED',
      redirectUrl,
      cancelUrl,
      customerName,
      customerEmail,
      customerPhone,
      billingAddress,
      billingCity,
      billingState,
      billingZip,
      billingCountry = 'AE'
    } = paymentData;

    // Validate required fields
    if (!orderId || !amount || !redirectUrl || !cancelUrl) {
      throw new Error('Missing required payment parameters');
    }

    // Prepare merchant parameters
    const merchantParams = {
      merchant_id: this.merchantId,
      order_id: orderId,
      amount: amount.toFixed(2),
      currency: currency,
      redirect_url: redirectUrl,
      cancel_url: cancelUrl,
      language: 'EN',
      billing_name: customerName || '',
      billing_address: billingAddress || '',
      billing_city: billingCity || '',
      billing_state: billingState || '',
      billing_zip: billingZip || '',
      billing_country: billingCountry,
      billing_tel: customerPhone || '',
      billing_email: customerEmail || '',
      delivery_name: customerName || '',
      delivery_address: billingAddress || '',
      delivery_city: billingCity || '',
      delivery_state: billingState || '',
      delivery_zip: billingZip || '',
      delivery_country: billingCountry,
      delivery_tel: customerPhone || '',
      merchant_param1: orderId, // Store order ID for reference
      merchant_param2: '', // Additional parameter if needed
      merchant_param3: '', // Additional parameter if needed
      merchant_param4: '', // Additional parameter if needed
      merchant_param5: '', // Additional parameter if needed
      promo_code: '', // Promo code if applicable
      customer_identifier: customerEmail || '' // Customer identifier
    };

    // Convert merchant parameters to query string
    const merchantParamString = Object.keys(merchantParams)
      .map(key => `${key}=${encodeURIComponent(merchantParams[key])}`)
      .join('&');

    // Encrypt the merchant parameters
    const encryptedData = this.encrypt(merchantParamString);

    // Return payment form data
    return {
      encRequest: encryptedData,
      access_code: this.accessCode
    };
  }

  /**
   * Parse and decrypt payment response from CCAvenue
   * @param {string} encResponse - Encrypted response from CCAvenue
   * @returns {Object} - Decrypted payment response
   */
  parsePaymentResponse(encResponse) {
    try {
      const decryptedResponse = this.decrypt(encResponse);
      const params = new URLSearchParams(decryptedResponse);
      const response = {};

      for (const [key, value] of params) {
        response[key] = value;
      }

      return response;
    } catch (error) {
      throw new Error(`Failed to parse payment response: ${error.message}`);
    }
  }

  /**
   * Verify payment response checksum (if applicable)
   * @param {Object} responseData - Payment response data
   * @returns {boolean} - True if valid
   */
  verifyPaymentResponse(responseData) {
    // CCAvenue typically doesn't require checksum verification
    // but we can add additional validation here if needed
    return responseData.order_id && responseData.tracking_id;
  }

  /**
   * Get payment status from response
   * @param {Object} responseData - Payment response data
   * @returns {string} - Payment status (Success, Failure, Pending, etc.)
   */
  getPaymentStatus(responseData) {
    const orderStatus = responseData.order_status || '';
    
    if (orderStatus === 'Success') {
      return 'Success';
    } else if (orderStatus === 'Failure' || orderStatus === 'Aborted') {
      return 'Failure';
    } else if (orderStatus === 'Pending') {
      return 'Pending';
    } else {
      return 'Unknown';
    }
  }
}

module.exports = new CCAvenueService();


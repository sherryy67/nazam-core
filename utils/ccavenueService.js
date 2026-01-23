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
   * Based on CCAvenue Node.js integration guide
   * @param {string} plainText - Plain text to encrypt
   * @returns {string} - Encrypted string
   */
  encrypt(plainText) {
    try {
      // CCAvenue requires MD5 hash of the working key to create the encryption key
      // The working key is provided as a hex string: 3975E51578741CE0758A7C8B148F642A
      const workingKey = this.workingKey.trim().replace(/\s+/g, '');
      
      // Create encryption key by hashing the working key with MD5
      const key = crypto.createHash('md5').update(workingKey).digest();
      
      // CCAvenue uses a specific IV: [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]
      const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
      
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
   * Based on CCAvenue Node.js integration guide
   * @param {string} encryptedText - Encrypted text to decrypt
   * @returns {string} - Decrypted string
   */
  decrypt(encryptedText) {
    try {
      // CCAvenue requires MD5 hash of the working key to create the decryption key
      // The working key is provided as a hex string: 3975E51578741CE0758A7C8B148F642A
      const workingKey = this.workingKey.trim().replace(/\s+/g, '');
      
      // Create decryption key by hashing the working key with MD5
      const key = crypto.createHash('md5').update(workingKey).digest();
      
      // CCAvenue uses a specific IV: [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]
      const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
      
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
      billingCountry = 'AE',
      merchant_param1,
      merchant_param2,
      merchant_param3,
      merchant_param4,
      merchant_param5
    } = paymentData;

    // Validate required fields
    if (!orderId || !amount || !redirectUrl || !cancelUrl) {
      throw new Error('Missing required payment parameters');
    }

    // Prepare merchant parameters
    // CCAvenue expects parameters in a specific order - put required fields first
    const merchantParams = {
      merchant_id: this.merchantId,
      order_id: orderId,
      amount: amount.toFixed(2),
      currency: currency,
      redirect_url: redirectUrl,
      cancel_url: cancelUrl,
      language: 'EN'
    };

    // Add billing information if available
    if (customerName) merchantParams.billing_name = customerName;
    if (billingAddress) merchantParams.billing_address = billingAddress;
    if (billingCity) merchantParams.billing_city = billingCity;
    if (billingState) merchantParams.billing_state = billingState;
    if (billingZip) merchantParams.billing_zip = billingZip;
    if (billingCountry) merchantParams.billing_country = billingCountry;
    if (customerPhone) merchantParams.billing_tel = customerPhone;
    if (customerEmail) merchantParams.billing_email = customerEmail;

    // Add delivery information (same as billing if not provided separately)
    if (customerName) merchantParams.delivery_name = customerName;
    if (billingAddress) merchantParams.delivery_address = billingAddress;
    if (billingCity) merchantParams.delivery_city = billingCity;
    if (billingState) merchantParams.delivery_state = billingState;
    if (billingZip) merchantParams.delivery_zip = billingZip;
    if (billingCountry) merchantParams.delivery_country = billingCountry;
    if (customerPhone) merchantParams.delivery_tel = customerPhone;

    // Add merchant parameters (used for tracking and callback processing)
    // merchant_param1: service request ID
    // merchant_param2: milestone ID or 'full'
    // merchant_param3: milestone order number or '0'
    if (merchant_param1) merchantParams.merchant_param1 = merchant_param1;
    if (merchant_param2) merchantParams.merchant_param2 = merchant_param2;
    if (merchant_param3) merchantParams.merchant_param3 = merchant_param3;
    if (merchant_param4) merchantParams.merchant_param4 = merchant_param4;
    if (merchant_param5) merchantParams.merchant_param5 = merchant_param5;

    // Add customer identifier if email is available
    if (customerEmail) merchantParams.customer_identifier = customerEmail;

    // Convert merchant parameters to query string
    // IMPORTANT: CCAvenue expects parameters WITHOUT URL encoding in the encrypted string
    // The values should be raw (not encoded) when encrypting
    const merchantParamString = Object.keys(merchantParams)
      .map(key => {
        const value = merchantParams[key];
        // Use raw value without encoding - CCAvenue will handle encoding after decryption
        return `${key}=${value || ''}`;
      })
      .join('&');

    // Debug: Log the parameter string (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('CCAvenue Parameter String:', merchantParamString.substring(0, 200) + '...');
    }

    // Encrypt the merchant parameters
    const encryptedData = this.encrypt(merchantParamString);
    
    // Debug: Log encrypted data length (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Encrypted Data Length:', encryptedData.length);
    }

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


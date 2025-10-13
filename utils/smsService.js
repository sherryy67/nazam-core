const axios = require('axios');

/**
 * SMS Service for Smart SMS Gateway
 * Handles OTP and notification SMS sending
 */
class SMSService {
  constructor() {
    this.baseUrl = 'https://smartsmsgateway.com/api/api_http.php';
    this.username = process.env.SMS_USERNAME||'facaltaasmkt';
    this.password = process.env.SMS_PASSWORD||'pZcJjDXi7Y';
    this.senderId = process.env.SMS_SENDER_ID || 'AD-NAZAM';
    
  }

  /**
   * Send OTP SMS to phone number
   * @param {string} phoneNumber - UAE phone number (with country code)
   * @param {string} otpCode - 6-digit OTP code
   * @returns {Promise<Object>} - SMS sending result
   */
  async sendOTP(phoneNumber, otpCode) {
    try {
      // Validate UAE phone number format
      if (!this.isValidUAEPhoneNumber(phoneNumber)) {
        throw new Error('Invalid UAE phone number format');
      }

      // Format phone number for UAE (remove +971 if present, add if missing)
      const formattedNumber = this.formatUAEPhoneNumber(phoneNumber);
      
      const message = `Your Nazam verification code is: ${otpCode}. This code will expire in 5 minutes. Do not share this code with anyone. OptOut 4741`;
      
      const params = {
        username: this.username,
        password: this.password,
        senderid: this.senderId,
        to: formattedNumber,
        sms: message
      };

      const response = await axios.get(this.baseUrl, { params });
      
      // Parse response based on Smart SMS Gateway format
      const result = this.parseSMSResponse(response.data);
      
      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
          message: 'OTP sent successfully'
        };
      } else {
        throw new Error(result.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('SMS Service Error:', error.message);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  /**
   * Send notification SMS
   * @param {string} phoneNumber - UAE phone number
   * @param {string} message - SMS message
   * @returns {Promise<Object>} - SMS sending result
   */
  async sendNotification(phoneNumber, message) {
    try {
      if (!this.isValidUAEPhoneNumber(phoneNumber)) {
        throw new Error('Invalid UAE phone number format');
      }

      const formattedNumber = this.formatUAEPhoneNumber(phoneNumber);
      
      const params = {
        username: this.username,
        password: this.password,
        senderid: this.senderId,
        to: formattedNumber,
        sms: message
      };

      const response = await axios.get(this.baseUrl, { params });
      const result = this.parseSMSResponse(response.data);
      
      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
          message: 'Notification sent successfully'
        };
      } else {
        throw new Error(result.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('SMS Service Error:', error.message);
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Validate UAE phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - Is valid UAE number
   */
  isValidUAEPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // UAE phone number patterns:
    // +971XXXXXXXXX (13 digits with country code)
    // 971XXXXXXXXX (12 digits with country code)
    // 0XXXXXXXXX (10 digits starting with 0)
    // 5XXXXXXXX (9 digits starting with 5)
    const uaePatterns = [
      /^971[0-9]{9}$/, // 971 + 9 digits
      /^0[0-9]{9}$/,   // 0 + 9 digits
      /^5[0-9]{8}$/    // 5 + 8 digits
    ];

    return uaePatterns.some(pattern => pattern.test(cleanNumber));
  }

  /**
   * Format phone number for UAE SMS gateway
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatUAEPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Convert to 971XXXXXXXXX format
    if (cleanNumber.startsWith('971')) {
      return cleanNumber;
    } else if (cleanNumber.startsWith('0')) {
      return '971' + cleanNumber.substring(1);
    } else if (cleanNumber.startsWith('5')) {
      return '971' + cleanNumber;
    } else if (cleanNumber.length === 9 && cleanNumber.startsWith('5')) {
      return '971' + cleanNumber;
    }
    
    return cleanNumber;
  }

  /**
   * Parse SMS gateway response
   * @param {string} response - Raw response from SMS gateway
   * @returns {Object} - Parsed response
   */
  parseSMSResponse(response) {
    try {
      // Smart SMS Gateway typically returns simple text responses
      // Success responses might be like: "Message sent successfully"
      // Error responses might be like: "ERROR: Invalid credentials"
      
      if (typeof response === 'string') {
        if (response.toLowerCase().includes('error')) {
          return {
            success: false,
            error: response
          };
        } else if (response.toLowerCase().includes('success') || 
                   response.toLowerCase().includes('sent')) {
          return {
            success: true,
            messageId: this.generateMessageId(),
            message: response
          };
        }
      }
      
      // If response is not a string or doesn't match patterns, assume success
      return {
        success: true,
        messageId: this.generateMessageId(),
        message: 'SMS sent successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse SMS response'
      };
    }
  }

  /**
   * Generate a unique message ID
   * @returns {string} - Unique message ID
   */
  generateMessageId() {
    return 'MSG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate 6-digit OTP code
   * @returns {string} - 6-digit OTP code
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = new SMSService();

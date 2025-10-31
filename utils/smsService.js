const axios = require('axios');
const path = require('path');

// Load environment variables with multiple fallback strategies
try {
  // Try loading from current directory
  require('dotenv').config();
} catch (error) {
  console.log('Failed to load .env from current directory');
}

try {
  // Try loading from project root
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch (error) {
  console.log('Failed to load .env from project root');
}

// Additional fallback for production
if (process.env.NODE_ENV === 'production') {
  console.log('Production environment detected, using hardcoded values as fallback');
}

/**
 * SMS Service for Smart SMS Gateway
 * Handles OTP and notification SMS sending
 */
class SMSService {
  constructor() {
    this.baseUrl = 'https://smartsmsgateway.com/api/api_http.php';
    
    this.username = process.env.SMS_USERNAME || 'facaltaasmkt';
    this.password = process.env.SMS_PASSWORD || 'pZcJjDXi7Y';
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
      
      // Log full response for debugging
      console.log('SMS Gateway Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      });
      
      // Parse response based on Smart SMS Gateway format
      const result = this.parseSMSResponse(response.data);
      
      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
          message: 'OTP sent successfully'
        };
      } else {
        // Check for IP whitelist errors specifically
        const errorMsg = result.error || 'Failed to send SMS';
        if (errorMsg.toLowerCase().includes('ip') || 
            errorMsg.toLowerCase().includes('whitelist') ||
            errorMsg.toLowerCase().includes('not allowed')) {
          console.error('⚠️ IP Whitelist Error Detected!');
          console.error('Full error response:', errorMsg);
          console.error('Please check that your EC2 outbound IP is whitelisted with the SMS provider.');
          console.error('You can use the check-outbound-ip.js script to find your actual outbound IP.');
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      // Enhanced error logging
      console.error('SMS Service Error Details:');
      console.error('Error Message:', error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
        console.error('Response Headers:', error.response.headers);
      }
      if (error.request) {
        console.error('Request made but no response received');
        console.error('Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params
        });
      }
      
      // Check for IP-related errors in the full error chain
      const fullError = JSON.stringify(error, null, 2);
      if (fullError.toLowerCase().includes('ip') || 
          fullError.toLowerCase().includes('whitelist') ||
          error.message.toLowerCase().includes('ip') ||
          error.message.toLowerCase().includes('whitelist')) {
        throw new Error(`IP Whitelist Error: ${error.message}. Please ensure your EC2 outbound IP is whitelisted with the SMS provider.`);
      }
      
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
      
      // Log full response for debugging
      console.log('SMS Gateway Response (Notification):', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      const result = this.parseSMSResponse(response.data);
      
      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
          message: 'Notification sent successfully'
        };
      } else {
        // Check for IP whitelist errors specifically
        const errorMsg = result.error || 'Failed to send SMS';
        if (errorMsg.toLowerCase().includes('ip') || 
            errorMsg.toLowerCase().includes('whitelist') ||
            errorMsg.toLowerCase().includes('not allowed')) {
          console.error('⚠️ IP Whitelist Error Detected!');
          console.error('Full error response:', errorMsg);
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('SMS Service Error Details (Notification):');
      console.error('Error Message:', error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
      }
      
      // Check for IP-related errors
      const fullError = JSON.stringify(error, null, 2);
      if (fullError.toLowerCase().includes('ip') || 
          fullError.toLowerCase().includes('whitelist') ||
          error.message.toLowerCase().includes('ip') ||
          error.message.toLowerCase().includes('whitelist')) {
        throw new Error(`IP Whitelist Error: ${error.message}. Please ensure your EC2 outbound IP is whitelisted with the SMS provider.`);
      }
      
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

  /**
   * Get the actual outbound IP address that external services see
   * This is useful for whitelisting with SMS providers
   * @returns {Promise<string>} - Outbound IP address
   */
  async getOutboundIP() {
    try {
      // Use multiple IP checking services for reliability
      const ipCheckServices = [
        'https://api.ipify.org?format=json',
        'https://api.myip.com',
        'https://ipinfo.io/json'
      ];

      for (const service of ipCheckServices) {
        try {
          const response = await axios.get(service, { timeout: 5000 });
          if (service.includes('ipify')) {
            return response.data.ip;
          } else if (service.includes('myip')) {
            return response.data.ip || response.data.IPv4;
          } else if (service.includes('ipinfo')) {
            return response.data.ip;
          }
        } catch (error) {
          console.warn(`Failed to get IP from ${service}:`, error.message);
          continue;
        }
      }
      
      throw new Error('Could not determine outbound IP from any service');
    } catch (error) {
      console.error('Error getting outbound IP:', error.message);
      throw error;
    }
  }
}

module.exports = new SMSService();

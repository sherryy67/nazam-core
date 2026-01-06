const axios = require('axios');

/**
 * WhatsApp Service for Zushh
 * Uses WhatsApp Business API (Cloud API) via Meta
 * Handles: Order confirmations, notifications, and customer communications
 */
class WhatsAppService {
  constructor() {
    // WhatsApp Business API Configuration
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;

    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('⚠️  WhatsApp credentials not found in environment variables. WhatsApp service will not work.');
      console.warn('Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in your .env file');
      this.configured = false;
    } else {
      this.configured = true;
    }
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {string|null} - Formatted phone number or null if invalid
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Remove leading + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // If number doesn't have country code, assume UAE (+971)
    if (cleaned.length === 9 && cleaned.startsWith('5')) {
      cleaned = '971' + cleaned;
    } else if (cleaned.length === 10 && cleaned.startsWith('05')) {
      cleaned = '971' + cleaned.substring(1);
    }

    // Validate length (should be 10-15 digits including country code)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return null;
    }

    return cleaned;
  }

  /**
   * Send WhatsApp message using the Cloud API
   * @param {string} to - Recipient phone number
   * @param {Object} messageData - Message payload
   * @returns {Promise<Object>} - API response
   */
  async sendMessage(to, messageData) {
    if (!this.configured) {
      throw new Error('WhatsApp service not configured. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in environment variables.');
    }

    const formattedPhone = this.formatPhoneNumber(to);
    if (!formattedPhone) {
      throw new Error('Invalid phone number format');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          ...messageData
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp message sent successfully:', response.data);
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        message: 'WhatsApp message sent successfully'
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error('WhatsApp Service Error:', errorMessage);
      throw new Error(`Failed to send WhatsApp message: ${errorMessage}`);
    }
  }

  /**
   * Send a text message
   * @param {string} to - Recipient phone number
   * @param {string} text - Message text
   * @returns {Promise<Object>} - API response
   */
  async sendTextMessage(to, text) {
    return await this.sendMessage(to, {
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    });
  }

  /**
   * Send order confirmation message to customer
   * @param {string} phone - Customer's phone number
   * @param {Object} serviceRequest - Service request details
   * @returns {Promise<Object>} - API response
   */
  async sendOrderConfirmation(phone, serviceRequest) {
    const customerName = serviceRequest.user_name || 'Customer';
    const serviceName = serviceRequest.service_name || 'Service';
    const categoryName = serviceRequest.category_name || 'Category';
    const orderId = serviceRequest._id?.toString().slice(-8).toUpperCase() || 'N/A';
    const requestType = serviceRequest.request_type || 'Service Request';
    const address = serviceRequest.address || 'N/A';
    const paymentMethod = serviceRequest.paymentMethod || 'Cash On Delivery';
    const numberOfUnits = serviceRequest.number_of_units || 1;
    const unitType = serviceRequest.unit_type || 'unit';

    // Format date
    let requestDate = 'TBD';
    if (serviceRequest.requested_date) {
      const date = new Date(serviceRequest.requested_date);
      requestDate = date.toLocaleDateString('en-AE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Build sub-services list if available
    let subServicesText = '';
    if (serviceRequest.selectedSubServices && serviceRequest.selectedSubServices.length > 0) {
      subServicesText = '\n\n📋 *Selected Services:*\n' + serviceRequest.selectedSubServices.map(sub =>
        `• ${sub.name} (Qty: ${sub.quantity || 1}) - AED ${(sub.rate * (sub.quantity || 1)).toFixed(2)}`
      ).join('\n');
    }

    // Build pricing section
    let pricingText = '';
    if (serviceRequest.request_type !== 'Quotation' && serviceRequest.total_price) {
      pricingText = '\n\n💰 *Payment Summary:*';
      if (serviceRequest.unit_price) {
        pricingText += `\nUnit Price: AED ${serviceRequest.unit_price.toFixed(2)}`;
      }
      if (serviceRequest.discountPercentage && serviceRequest.discountAmount) {
        pricingText += `\nDiscount (${serviceRequest.discountPercentage}%): -AED ${serviceRequest.discountAmount.toFixed(2)}`;
      }
      pricingText += `\n*Total: AED ${serviceRequest.total_price.toFixed(2)}*`;
      pricingText += `\nPayment: ${paymentMethod}`;
    } else if (serviceRequest.request_type === 'Quotation') {
      pricingText = '\n\n📝 _This is a quotation request. Our team will contact you with a detailed quote._';
    }

    const message = `✅ *Order Confirmed!*

Hello ${customerName},

Thank you for your order with Zushh! 🎉

📦 *Order Details:*
Order ID: #${orderId}
Category: ${categoryName}
Service: ${serviceName}
Type: ${requestType}
Quantity: ${numberOfUnits} ${unitType === 'per_hour' ? 'hour(s)' : 'unit(s)'}${subServicesText}

📅 *Appointment:*
Date: ${requestDate}
Address: ${address}${serviceRequest.message ? `\nNotes: ${serviceRequest.message}` : ''}${pricingText}

*What's Next?*
1️⃣ We'll assign a professional vendor
2️⃣ You'll receive a confirmation
3️⃣ Vendor will contact you
4️⃣ Enjoy your service! ✨

Need help? Contact us at info@zushh.com

_Thank you for choosing Zushh!_ 💚`;

    return await this.sendTextMessage(phone, message);
  }

  /**
   * Send a template message (for pre-approved messages)
   * @param {string} to - Recipient phone number
   * @param {string} templateName - Template name
   * @param {string} languageCode - Language code (default: en)
   * @param {Array} components - Template components
   * @returns {Promise<Object>} - API response
   */
  async sendTemplateMessage(to, templateName, languageCode = 'en', components = []) {
    return await this.sendMessage(to, {
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    });
  }

  /**
   * Test WhatsApp configuration by checking API access
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    if (!this.configured) {
      return {
        success: false,
        message: 'WhatsApp service not configured. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in environment variables.',
        troubleshooting: [
          'Create a Meta Business account at business.facebook.com',
          'Set up WhatsApp Business API in Meta for Developers',
          'Get your Phone Number ID from the WhatsApp dashboard',
          'Generate a permanent access token',
          'Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to your .env file'
        ]
      };
    }

    try {
      // Test by fetching phone number details
      const response = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        message: 'WhatsApp service is configured correctly',
        phoneNumber: response.data.display_phone_number,
        verifiedName: response.data.verified_name
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      return {
        success: false,
        message: `WhatsApp service configuration error: ${errorMessage}`,
        troubleshooting: [
          'Verify your WHATSAPP_PHONE_NUMBER_ID is correct',
          'Check if your WHATSAPP_ACCESS_TOKEN is valid and not expired',
          'Ensure your WhatsApp Business account is properly set up',
          'Check if the phone number is verified in Meta Business Suite'
        ]
      };
    }
  }
}

module.exports = new WhatsAppService();

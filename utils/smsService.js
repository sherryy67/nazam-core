const axios = require("axios");
const path = require("path");

// Load environment variables with multiple fallback strategies
try {
  // Try loading from current directory
  require("dotenv").config();
} catch (error) {
  console.log("Failed to load .env from current directory");
}

try {
  // Try loading from project root
  require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });
} catch (error) {
  console.log("Failed to load .env from project root");
}

// Additional fallback for production
if (process.env.NODE_ENV === "production") {
  console.log(
    "Production environment detected, using hardcoded values as fallback",
  );
}

/**
 * SMS Service for Smart SMS Gateway
 * Handles OTP and notification SMS sending
 */
class SMSService {
  constructor() {
    this.baseUrl = "https://smartsmsgateway.com/api/api_http.php";

    this.username = process.env.SMS_USERNAME || "facaltaasmkt";
    this.password = process.env.SMS_PASSWORD || "pZcJjDXi7Y";
    this.senderId = process.env.SMS_SENDER_ID || "AD-NAZAM";
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
        throw new Error("Invalid UAE phone number format");
      }

      // Format phone number for UAE (remove +971 if present, add if missing)
      const formattedNumber = this.formatUAEPhoneNumber(phoneNumber);

      const message = `Your Nazam verification code is: ${otpCode}. This code will expire in 5 minutes. Do not share this code with anyone. OptOut 4741`;

      const params = {
        username: this.username,
        password: this.password,
        senderid: this.senderId,
        to: formattedNumber,
        text: message,
      };

      const response = await axios.get(this.baseUrl, { params });

      // Parse response based on Smart SMS Gateway format
      const result = this.parseSMSResponse(response.data);

      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
          message: "OTP sent successfully",
        };
      } else {
        throw new Error(result.error || "Failed to send SMS");
      }
    } catch (error) {
      console.error("SMS Service Error:", error.message);
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
        throw new Error("Invalid UAE phone number format");
      }

      const formattedNumber = this.formatUAEPhoneNumber(phoneNumber);

      const params = {
        username: this.username,
        password: this.password,
        senderid: this.senderId,
        to: formattedNumber,
        text: message,
      };

      const response = await axios.get(this.baseUrl, { params });
      const result = this.parseSMSResponse(response.data);

      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
          message: "Notification sent successfully",
        };
      } else {
        throw new Error(result.error || "Failed to send SMS");
      }
    } catch (error) {
      console.error("SMS Service Error:", error.message);
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
    const cleanNumber = phoneNumber.replace(/\D/g, "");

    // UAE phone number patterns:
    // +971XXXXXXXXX (13 digits with country code)
    // 971XXXXXXXXX (12 digits with country code)
    // 0XXXXXXXXX (10 digits starting with 0)
    // 5XXXXXXXX (9 digits starting with 5)
    const uaePatterns = [
      /^971[0-9]{9}$/, // 971 + 9 digits
      /^0[0-9]{9}$/, // 0 + 9 digits
      /^5[0-9]{8}$/, // 5 + 8 digits
    ];

    return uaePatterns.some((pattern) => pattern.test(cleanNumber));
  }

  /**
   * Format phone number for UAE SMS gateway
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatUAEPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleanNumber = phoneNumber.replace(/\D/g, "");

    // Convert to 971XXXXXXXXX format
    if (cleanNumber.startsWith("971")) {
      return cleanNumber;
    } else if (cleanNumber.startsWith("0")) {
      return "971" + cleanNumber.substring(1);
    } else if (cleanNumber.startsWith("5")) {
      return "971" + cleanNumber;
    } else if (cleanNumber.length === 9 && cleanNumber.startsWith("5")) {
      return "971" + cleanNumber;
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

      if (typeof response === "string") {
        if (response.toLowerCase().includes("error")) {
          return {
            success: false,
            error: response,
          };
        } else if (
          response.toLowerCase().includes("success") ||
          response.toLowerCase().includes("sent")
        ) {
          return {
            success: true,
            messageId: this.generateMessageId(),
            message: response,
          };
        }
      }

      // If response is not a string or doesn't match patterns, assume success
      return {
        success: true,
        messageId: this.generateMessageId(),
        message: "SMS sent successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to parse SMS response",
      };
    }
  }

  /**
   * Generate a unique message ID
   * @returns {string} - Unique message ID
   */
  generateMessageId() {
    return "MSG_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate 6-digit OTP code
   * @returns {string} - 6-digit OTP code
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send order confirmation SMS to customer
   * @param {string} phoneNumber - Customer's phone number
   * @param {Object} serviceRequest - Service request details
   * @returns {Promise<Object>} - SMS sending result
   */
  async sendOrderConfirmation(phoneNumber, serviceRequest) {
    const customerName = serviceRequest.user_name || "Customer";
    const serviceName = serviceRequest.service_name || "Service";
    const orderId =
      serviceRequest._id?.toString().slice(-6).toUpperCase() || "N/A";

    // Format date
    let requestDate = "TBD";
    if (serviceRequest.requested_date) {
      const date = new Date(serviceRequest.requested_date);
      requestDate = date.toLocaleDateString("en-AE", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Build pricing text
    let priceText = "";
    if (
      serviceRequest.request_type !== "Quotation" &&
      serviceRequest.total_price
    ) {
      priceText = ` Total: AED ${serviceRequest.total_price.toFixed(2)}.`;
    }

    // SMS has character limits, so keep it concise
    const message = `ZUSH Order Confirmed! Hi ${customerName}, your order #${orderId} for ${serviceName} is confirmed. Date: ${requestDate}.${priceText} We'll assign a vendor soon. Questions? Contact info@zushh.com. OptOut 4741`;

    return await this.sendNotification(phoneNumber, message);
  }

  /**
   * Send welcome SMS to newly created user
   * @param {string} phoneNumber - User's phone number
   * @param {string} userName - User's name
   * @param {string} password - User's password (for admin-created accounts)
   * @returns {Promise<Object>} - SMS sending result
   */
  async sendWelcomeNotification(phoneNumber, userName, password = null) {
    let message;
    if (password) {
      // Admin-created account with credentials
      message = `Welcome to ZUSH, ${userName}! Your account has been created. Password: ${password}. Login at zushh.com. Questions? Contact info@zushh.com. OptOut 4741`;
    } else {
      // Regular welcome message
      message = `Welcome to ZUSH, ${userName}! Your account is ready. Explore our services at zushh.com. Questions? Contact info@zushh.com. OptOut 4741`;
    }

    return await this.sendNotification(phoneNumber, message);
  }

  /**
   * Send order status update SMS to customer
   * @param {string} phoneNumber - Customer's phone number
   * @param {Object} serviceRequest - Service request details
   * @param {string} newStatus - New status of the order
   * @param {Object} vendor - Vendor details (optional)
   * @returns {Promise<Object>} - SMS sending result
   */
  async sendStatusUpdateNotification(phoneNumber, serviceRequest, newStatus, vendor = null) {
    const customerName = serviceRequest.user_name || "Customer";
    const serviceName = serviceRequest.service_name || "Service";
    const orderId =
      serviceRequest._id?.toString().slice(-6).toUpperCase() || "N/A";

    let statusMessage;
    switch (newStatus) {
      case "Assigned":
        const vendorName = vendor ? `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim() : "a vendor";
        statusMessage = `Hi ${customerName}, your order #${orderId} for ${serviceName} has been assigned to ${vendorName}. They will contact you soon.`;
        break;
      case "Accepted":
        statusMessage = `Hi ${customerName}, your order #${orderId} for ${serviceName} has been accepted by the vendor. Work will begin as scheduled.`;
        break;
      case "InProgress":
        statusMessage = `Hi ${customerName}, your order #${orderId} for ${serviceName} is now in progress.`;
        break;
      case "Completed":
        statusMessage = `Hi ${customerName}, your order #${orderId} for ${serviceName} has been completed. Thank you for choosing ZUSH!`;
        break;
      case "Cancelled":
        statusMessage = `Hi ${customerName}, your order #${orderId} for ${serviceName} has been cancelled. Contact info@zushh.com for assistance.`;
        break;
      default:
        statusMessage = `Hi ${customerName}, your order #${orderId} status has been updated to: ${newStatus}.`;
    }

    const message = `ZUSH Update: ${statusMessage} OptOut 4741`;

    return await this.sendNotification(phoneNumber, message);
  }

  /**
   * Send quotation price notification SMS to customer
   * @param {string} phoneNumber - Customer's phone number
   * @param {Object} serviceRequest - Service request details
   * @param {number} totalPrice - Quoted price
   * @returns {Promise<Object>} - SMS sending result
   */
  async sendQuotationPriceNotification(phoneNumber, serviceRequest, totalPrice) {
    const customerName = serviceRequest.user_name || "Customer";
    const serviceName = serviceRequest.service_name || "Service";
    const orderId =
      serviceRequest._id?.toString().slice(-6).toUpperCase() || "N/A";

    const message = `ZUSH Quotation: Hi ${customerName}, your quotation #${orderId} for ${serviceName} is ready. Price: AED ${totalPrice.toFixed(2)}. Login to accept or contact info@zushh.com. OptOut 4741`;

    return await this.sendNotification(phoneNumber, message);
  }

  /**
   * Send vendor assignment notification SMS to customer
   * @param {string} phoneNumber - Customer's phone number
   * @param {Object} serviceRequest - Service request details
   * @param {Object} vendor - Vendor details
   * @returns {Promise<Object>} - SMS sending result
   */
  async sendVendorAssignedNotification(phoneNumber, serviceRequest, vendor) {
    const customerName = serviceRequest.user_name || "Customer";
    const serviceName = serviceRequest.service_name || "Service";
    const orderId =
      serviceRequest._id?.toString().slice(-6).toUpperCase() || "N/A";
    const vendorName = vendor ? `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim() : "a professional";

    const message = `ZUSH Update: Hi ${customerName}, great news! Your order #${orderId} for ${serviceName} has been assigned to ${vendorName}. They will contact you shortly. OptOut 4741`;

    return await this.sendNotification(phoneNumber, message);
  }

  /**
   * Send payment status notification SMS to customer
   * @param {string} phoneNumber - Customer's phone number
   * @param {Object} serviceRequest - Service request details
   * @param {string} paymentStatus - Payment status (Success, Failure, Completed)
   * @returns {Promise<Object>} - SMS sending result
   */
  async sendPaymentStatusNotification(phoneNumber, serviceRequest, paymentStatus) {
    const customerName = serviceRequest.user_name || "Customer";
    const serviceName = serviceRequest.service_name || "Service";
    const orderId =
      serviceRequest._id?.toString().slice(-6).toUpperCase() || "N/A";

    let statusMessage;
    switch (paymentStatus) {
      case "Success":
      case "Completed":
        const amount = serviceRequest.total_price ? `AED ${serviceRequest.total_price.toFixed(2)}` : "";
        statusMessage = `Hi ${customerName}, payment ${amount} for order #${orderId} (${serviceName}) has been received. Thank you!`;
        break;
      case "Failure":
        statusMessage = `Hi ${customerName}, payment for order #${orderId} (${serviceName}) failed. Please try again or contact info@zushh.com.`;
        break;
      case "Pending":
        statusMessage = `Hi ${customerName}, payment for order #${orderId} (${serviceName}) is pending. Please complete payment to proceed.`;
        break;
      default:
        statusMessage = `Hi ${customerName}, payment status for order #${orderId} updated to: ${paymentStatus}.`;
    }

    const message = `ZUSH Payment: ${statusMessage} OptOut 4741`;

    return await this.sendNotification(phoneNumber, message);
  }
}

module.exports = new SMSService();

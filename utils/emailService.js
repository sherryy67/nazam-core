const nodemailer = require("nodemailer");

/**
 * Comprehensive Email Service for ZUSH
 * Uses Microsoft 365/Outlook SMTP (GoDaddy Microsoft)
 * Handles: Account creation, service assignments, admin notifications, and marketing emails
 */
class EmailService {
  constructor() {
    // Microsoft 365/Outlook SMTP Configuration
    const emailUser =
      process.env.EMAIL_USER || process.env.Email || "info@zushh.com";
    const emailPass =
      process.env.EMAIL_PASS ||
      process.env.EMAIL_PASSWORD ||
      process.env.Password;
    const emailFrom = process.env.EMAIL_FROM || "info@zushh.com";
    const smtpHost =
      process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.office365.com";
    const smtpPort = parseInt(
      process.env.EMAIL_PORT || process.env.SMTP_PORT || "587",
    );

    this.emailFrom = emailFrom;

    if (!emailPass) {
      console.warn(
        "⚠️  Email password not found in environment variables. Email service will not work.",
      );
      console.warn(
        "Please set EMAIL_PASS, EMAIL_PASSWORD, or Password in your .env file",
      );
      this.transporter = null;
      return;
    }

    // Create transporter for Microsoft 365/Outlook
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // true for 465, false for other ports (587 uses STARTTLS)
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
      // Additional options for better compatibility
      requireTLS: true,
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - Is valid email
   */
  isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send email using the transporter
   * @param {Object} mailOptions - Nodemailer mail options
   * @returns {Promise<Object>} - Email sending result
   */
  async sendEmail(mailOptions) {
    try {
      if (!this.transporter) {
        throw new Error(
          "Email service not configured. Please set email credentials in environment variables.",
        );
      }

      const result = await this.transporter.sendMail({
        from: this.emailFrom,
        ...mailOptions,
      });

      console.log("Email sent successfully:", result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        message: "Email sent successfully",
      };
    } catch (error) {
      console.error("Email Service Error:", error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send welcome email when customer creates account
   * @param {string} email - Customer's email address
   * @param {string} name - Customer's name
   * @returns {Promise<Object>} - Email sending result
   */
  async sendWelcomeEmail(email, name) {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const subject = "Welcome to ZUSH!";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ZUSH</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <img src="https://mynazam-s3.s3.us-east-1.amazonaws.com/uploads/1769798856545-zush-logo-latest.png" alt="Zush" style="max-width: 150px; height: auto;">
              <p style="color: #666; margin: 5px 0;">Your Trusted Service Partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #333; margin-top: 0;">Welcome ${name}!</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Thank you for creating your account with ZUSH. We're excited to have you on board!
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      With ZUSH, you can easily request services, track your orders, and connect with trusted vendors in your area.
                    </p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">What you can do:</h3>
                      <ul style="color: #666; font-size: 16px; line-height: 1.8;">
                        <li>Request services from our wide range of offerings</li>
                        <li>Track your service requests in real-time</li>
                        <li>Get connected with professional vendors</li>
                        <li>Manage your account and preferences</li>
                      </ul>
                    </div>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      If you have any questions or need assistance, feel free to contact our support team.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
Welcome to ZUSH!

Thank you for creating your account with ZUSH, ${name}. We're excited to have you on board!

With ZUSH, you can easily request services, track your orders, and connect with trusted vendors in your area.

What you can do:
- Request services from our wide range of offerings
- Track your service requests in real-time
- Get connected with professional vendors
- Manage your account and preferences

If you have any questions or need assistance, feel free to contact our support team.

Best regards,
The ZUSH Team

© ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send email to customer when service request is assigned to a vendor
   * @param {string} email - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {Object} serviceRequest - Service request details
   * @param {Object} vendor - Vendor details
   * @returns {Promise<Object>} - Email sending result
   */
  async sendServiceAssignedEmail(email, customerName, serviceRequest, vendor) {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const vendorName = vendor
      ? `${vendor.firstName || ""} ${vendor.lastName || ""}`.trim()
      : "Assigned Vendor";
    const serviceName = serviceRequest.service_name || "Service";
    const requestDate = serviceRequest.requested_date
      ? new Date(serviceRequest.requested_date).toLocaleDateString()
      : "TBD";
    const requestType = serviceRequest.request_type || "Service Request";

    const subject = `Your ${serviceName} Request Has Been Assigned`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Request Assigned</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <img src="https://mynazam-s3.s3.us-east-1.amazonaws.com/uploads/1769798856545-zush-logo-latest.png" alt="Zush" style="max-width: 150px; height: auto;">
              <p style="color: #666; margin: 5px 0;">Your Trusted Service Partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #333; margin-top: 0;">Great News, ${customerName}!</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Your service request has been assigned to a professional vendor.
                    </p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">Service Request Details:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${serviceName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Request Type:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${requestType}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Scheduled Date:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${requestDate}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Assigned Vendor:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${vendorName}</td>
                        </tr>
                        ${
                          serviceRequest.total_price
                            ? `
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Total Price:</strong></td>
                          <td style="padding: 8px 0; color: #333;">AED ${serviceRequest.total_price.toFixed(2)}</td>
                        </tr>
                        `
                            : ""
                        }
                      </table>
                    </div>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Your assigned vendor will contact you soon to confirm the details and schedule.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      You can track your service request status in your account dashboard.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
Great News, ${customerName}!

Your service request has been assigned to a professional vendor.

Service Request Details:
- Service: ${serviceName}
- Request Type: ${requestType}
- Scheduled Date: ${requestDate}
- Assigned Vendor: ${vendorName}
${serviceRequest.total_price ? `- Total Price: AED ${serviceRequest.total_price.toFixed(2)}` : ""}

Your assigned vendor will contact you soon to confirm the details and schedule.
You can track your service request status in your account dashboard.

Best regards,
The ZUSH Team

© ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send email to admin when customer submits a service request
   * @param {string} adminEmail - Admin's email address
   * @param {Object} serviceRequest - Service request details
   * @returns {Promise<Object>} - Email sending result
   */
  async sendAdminNotificationEmail(adminEmail, serviceRequest) {
    if (!this.isValidEmail(adminEmail)) {
      throw new Error("Invalid email format");
    }

    const customerName = serviceRequest.user_name || "Customer";
    const serviceName = serviceRequest.service_name || "Service";
    const customerEmail = serviceRequest.user_email || "N/A";
    const customerPhone = serviceRequest.user_phone || "N/A";
    const requestDate = serviceRequest.requested_date
      ? new Date(serviceRequest.requested_date).toLocaleDateString()
      : "TBD";
    const requestType = serviceRequest.request_type || "Service Request";
    const address = serviceRequest.address || "N/A";
    const requestId = serviceRequest._id || serviceRequest.id || "N/A";

    const subject = `New Service Request: ${serviceName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Service Request</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <h1 style="color: #333; margin: 0;">ZUSH Admin</h1>
              <p style="color: #666; margin: 5px 0;">Service Management Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #d9534f; margin-top: 0;">New Service Request Received</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      A new service request has been submitted and requires your attention.
                    </p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                      <h3 style="color: #333; margin-top: 0;">Request Details:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Request ID:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${requestId}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${serviceName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Request Type:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${requestType}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Scheduled Date:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${requestDate}</td>
                        </tr>
                      </table>
                    </div>
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">Customer Information:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Name:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${customerName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${customerEmail}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${customerPhone}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Address:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${address}</td>
                        </tr>
                      </table>
                    </div>
                    ${
                      serviceRequest.total_price
                        ? `
                    <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                      <p style="color: #333; margin: 0;"><strong>Total Price: AED ${serviceRequest.total_price.toFixed(2)}</strong></p>
                    </div>
                    `
                        : ""
                    }
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Please review this request and assign it to an appropriate vendor.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>ZUSH System</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
New Service Request Received

A new service request has been submitted and requires your attention.

Request Details:
- Request ID: ${requestId}
- Service: ${serviceName}
- Request Type: ${requestType}
- Scheduled Date: ${requestDate}

Customer Information:
- Name: ${customerName}
- Email: ${customerEmail}
- Phone: ${customerPhone}
- Address: ${address}

${serviceRequest.total_price ? `Total Price: AED ${serviceRequest.total_price.toFixed(2)}` : ""}

Please review this request and assign it to an appropriate vendor.

Best regards,
ZUSH System

© ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
    `;

    return await this.sendEmail({
      to: adminEmail,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send marketing email (for admin use)
   * @param {string|Array} recipients - Email address(es) to send to
   * @param {string} subject - Email subject
   * @param {string} message - Email message/content
   * @param {string} title - Optional title for the email
   * @returns {Promise<Object>} - Email sending result
   */
  async sendMarketingEmail(
    recipients,
    subject,
    message,
    title = "Important Update from ZUSH",
  ) {
    // Validate recipients
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];
    const validRecipients = recipientList.filter((email) =>
      this.isValidEmail(email),
    );

    if (validRecipients.length === 0) {
      throw new Error("No valid email addresses provided");
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <img src="https://mynazam-s3.s3.us-east-1.amazonaws.com/uploads/1769798856545-zush-logo-latest.png" alt="Zush" style="max-width: 150px; height: auto;">
              <p style="color: #666; margin: 5px 0;">Your Trusted Service Partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #333; margin-top: 0;">${title}</h2>
                    <div style="color: #666; font-size: 16px; line-height: 1.6;">
                      ${message.replace(/\n/g, "<br>")}
                    </div>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                You are receiving this email because you are a registered user of ZUSH.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send to all recipients
    const results = [];
    for (const recipient of validRecipients) {
      try {
        const result = await this.sendEmail({
          to: recipient,
          subject: subject,
          html: html,
          text: message,
        });
        results.push({ recipient, success: true, ...result });
      } catch (error) {
        results.push({ recipient, success: false, error: error.message });
      }
    }

    return {
      success: results.every((r) => r.success),
      results: results,
      totalSent: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
    };
  }

  /**
   * Send OTP email (for backward compatibility)
   * @param {string} email - User's email address
   * @param {string} otpCode - 6-digit OTP code
   * @returns {Promise<Object>} - Email sending result
   */
  async sendOTP(email, otpCode) {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const subject = "ZUSH - Verification Code";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <h1 style="color: #333; margin: 0;">ZUSH</h1>
              <p style="color: #666; margin: 5px 0;">Service Management Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td style="text-align: center;">
                    <h2 style="color: #333; margin-bottom: 20px;">Verification Code</h2>
                    <p style="color: #666; font-size: 16px; margin-bottom: 25px;">
                      Your ZUSH verification code is:
                    </p>
                    <div style="background-color: #007bff; color: white; font-size: 32px; font-weight: bold; 
                               padding: 20px; border-radius: 8px; letter-spacing: 5px; margin: 20px 0; display: inline-block;">
                      ${otpCode}
                    </div>
                    <p style="color: #666; font-size: 14px; margin: 20px 0;">
                      This code will expire in <strong>5 minutes</strong>.
                    </p>
                    <p style="color: #dc3545; font-size: 14px; margin: 20px 0;">
                      <strong>Important:</strong> Do not share this code with anyone. ZUSH will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
ZUSH - Verification Code

Your ZUSH verification code is: ${otpCode}

This code will expire in 5 minutes.

Important: Do not share this code with anyone. ZUSH will never ask for your verification code.

If you didn't request this code, please ignore this email.

© ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send contact us email to admin (info@zushh.com)
   * @param {Object} contactData - Contact form data
   * @param {string} contactData.firstName - User's first name
   * @param {string} contactData.lastName - User's last name
   * @param {string} contactData.email - User's email address
   * @param {string} contactData.phone - User's phone number
   * @param {string} contactData.subject - Contact subject
   * @param {string} contactData.message - Contact message
   * @returns {Promise<Object>} - Email sending result
   */
  async sendContactEmail(contactData) {
    const { firstName, lastName, email, phone, subject, message } = contactData;

    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const adminEmail = "info@zushh.com";
    const customerName = `${firstName} ${lastName}`.trim();

    const emailSubject = `Contact Us: ${subject}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contact Us Inquiry</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <h1 style="color: #333; margin: 0;">ZUSH</h1>
              <p style="color: #666; margin: 5px 0;">Contact Us Inquiry</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #d9534f; margin-top: 0;">New Contact Us Inquiry</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      You have received a new contact inquiry through the ZUSH website.
                    </p>

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">Contact Information:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666; font-weight: bold; width: 120px;">Name:</td>
                          <td style="padding: 8px 0; color: #333;">${customerName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666; font-weight: bold;">Email:</td>
                          <td style="padding: 8px 0; color: #333;">
                            <a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666; font-weight: bold;">Phone:</td>
                          <td style="padding: 8px 0; color: #333;">
                            <a href="tel:${phone}" style="color: #007bff; text-decoration: none;">${phone}</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666; font-weight: bold;">Subject:</td>
                          <td style="padding: 8px 0; color: #333; font-weight: bold;">${subject}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                      <h3 style="color: #333; margin-top: 0;">Message:</h3>
                      <div style="color: #666; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
                        ${message.replace(/\n/g, "<br>")}
                      </div>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                      <h3 style="color: #333; margin-top: 0;">Quick Actions:</h3>
                      <p style="color: #155724; margin: 10px 0;">
                        <a href="mailto:${email}?subject=Re: ${subject}" style="color: #155724; text-decoration: underline;">
                          Reply to ${firstName}
                        </a>
                      </p>
                      <p style="color: #155724; margin: 10px 0;">
                        <a href="tel:${phone}" style="color: #155724; text-decoration: underline;">
                          Call ${firstName}
                        </a>
                      </p>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <p style="color: #666; font-size: 14px; margin: 0;">
                        <strong>Inquiry Details:</strong><br>
                        Received: ${new Date().toLocaleString()}<br>
                        Source: Contact Us Form
                      </p>
                    </div>

                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>ZUSH System</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                This is an automated notification from the ZUSH contact system.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
ZUSH - New Contact Us Inquiry

You have received a new contact inquiry through the ZUSH website.

Contact Information:
- Name: ${customerName}
- Email: ${email}
- Phone: ${phone}
- Subject: ${subject}

Message:
${message}

Quick Actions:
- Reply: mailto:${email}?subject=Re: ${subject}
- Call: tel:${phone}

Inquiry Details:
- Received: ${new Date().toLocaleString()}
- Source: Contact Us Form

Best regards,
ZUSH System

© ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
    `;

    return await this.sendEmail({
      to: adminEmail,
      subject: emailSubject,
      html: html,
      text: text,
    });
  }

  /**
   * Send account credentials email when admin creates a user account
   * @param {string} userEmail - User's email address
   * @param {string} userName - User's name
   * @param {string} password - User's password (plain text)
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<Object>} - Email sending result
   */
  async sendUserAccountCredentialsEmail(
    userEmail,
    userName,
    password,
    phoneNumber,
  ) {
    if (!this.isValidEmail(userEmail)) {
      throw new Error("Invalid email format");
    }

    const subject = "Your ZUSH Account Has Been Created";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Created</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <img src="https://mynazam-s3.s3.us-east-1.amazonaws.com/uploads/1769798856545-zush-logo-latest.png" alt="Zush" style="max-width: 150px; height: auto;">
              <p style="color: #666; margin: 5px 0;">Your Trusted Service Partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #333; margin-top: 0;">Welcome to ZUSH, ${userName}!</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Your account has been created by the ZUSH admin team. You can now log in and start using our services.
                    </p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                      <h3 style="color: #155724; margin-top: 0;">Your Login Credentials:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 10px 0; color: #155724; font-weight: bold; width: 100px;">Email:</td>
                          <td style="padding: 10px 0; color: #155724; font-family: monospace; font-size: 15px;">${userEmail}</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #155724; font-weight: bold;">Phone:</td>
                          <td style="padding: 10px 0; color: #155724; font-family: monospace; font-size: 15px;">${phoneNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #155724; font-weight: bold;">Password:</td>
                          <td style="padding: 10px 0; color: #155724; font-family: monospace; font-size: 15px;">${password}</td>
                        </tr>
                      </table>
                    </div>
                    <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                      <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>Security Tip:</strong> We recommend changing your password after your first login for better security.
                      </p>
                    </div>
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">What you can do:</h3>
                      <ul style="color: #666; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                        <li>Request services from our wide range of offerings</li>
                        <li>Track your service requests in real-time</li>
                        <li>Get connected with professional vendors</li>
                        <li>Manage your account and preferences</li>
                      </ul>
                    </div>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      If you have any questions or need assistance, feel free to contact our support team.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #dc3545; font-size: 12px; margin: 5px 0 0 0;">
                Please do not share your credentials with anyone.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
Welcome to ZUSH, ${userName}!

Your account has been created by the ZUSH admin team. You can now log in and start using our services.

Your Login Credentials:
- Email: ${userEmail}
- Phone: ${phoneNumber}
- Password: ${password}

Security Tip: We recommend changing your password after your first login for better security.

What you can do:
- Request services from our wide range of offerings
- Track your service requests in real-time
- Get connected with professional vendors
- Manage your account and preferences

If you have any questions or need assistance, feel free to contact our support team.

Best regards,
The ZUSH Team

© ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
Please do not share your credentials with anyone.
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send notification to admin when a new user account is created
   * @param {string} adminEmail - Admin's email address
   * @param {Object} userData - User data (name, email, phoneNumber)
   * @param {string} password - User's password (plain text)
   * @returns {Promise<Object>} - Email sending result
   */
  async sendAdminUserCreatedNotification(adminEmail, userData, password) {
    if (!this.isValidEmail(adminEmail)) {
      throw new Error("Invalid email format");
    }

    const { name, email, phoneNumber, _id } = userData;
    const createdAt = new Date().toLocaleString();

    const subject = `New User Account Created: ${name}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New User Account Created</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <h1 style="color: #333; margin: 0;">ZUSH Admin</h1>
              <p style="color: #666; margin: 5px 0;">User Management</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #28a745; margin-top: 0;">New User Account Created</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      A new user account has been created successfully by an admin.
                    </p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">User Information:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        ${
                          _id
                            ? `
                        <tr>
                          <td style="padding: 8px 0; color: #666; font-weight: bold; width: 120px;">User ID:</td>
                          <td style="padding: 8px 0; color: #333; font-family: monospace;">${_id}</td>
                        </tr>
                        `
                            : ""
                        }
                        <tr>
                          <td style="padding: 8px 0; color: #666; font-weight: bold;">Name:</td>
                          <td style="padding: 8px 0; color: #333;">${name}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666; font-weight: bold;">Email:</td>
                          <td style="padding: 8px 0; color: #333;">
                            <a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666; font-weight: bold;">Phone:</td>
                          <td style="padding: 8px 0; color: #333;">
                            <a href="tel:${phoneNumber}" style="color: #007bff; text-decoration: none;">${phoneNumber}</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666; font-weight: bold;">Created At:</td>
                          <td style="padding: 8px 0; color: #333;">${createdAt}</td>
                        </tr>
                      </table>
                    </div>
                    <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                      <h3 style="color: #856404; margin-top: 0;">Account Credentials:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #856404; font-weight: bold; width: 100px;">Email:</td>
                          <td style="padding: 8px 0; color: #856404; font-family: monospace;">${email}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #856404; font-weight: bold;">Password:</td>
                          <td style="padding: 8px 0; color: #856404; font-family: monospace;">${password}</td>
                        </tr>
                      </table>
                      <p style="color: #856404; font-size: 13px; margin: 15px 0 0 0;">
                        <strong>Note:</strong> Please share these credentials with the user securely.
                      </p>
                    </div>
                    <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                      <p style="color: #155724; margin: 0;">
                        <strong>Status:</strong> Account is active and OTP verified (verification skipped for admin-created users)
                      </p>
                    </div>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>ZUSH System</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                This is an automated notification from the ZUSH system.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
New User Account Created

A new user account has been created successfully by an admin.

User Information:
${_id ? `- User ID: ${_id}` : ""}
- Name: ${name}
- Email: ${email}
- Phone: ${phoneNumber}
- Created At: ${createdAt}

Account Credentials:
- Email: ${email}
- Password: ${password}

Note: Please share these credentials with the user securely.

Status: Account is active and OTP verified (verification skipped for admin-created users)

Best regards,
ZUSH System

© ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
    `;

    return await this.sendEmail({
      to: adminEmail,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send order confirmation email to customer when admin submits order on their behalf
   * @param {string} email - Customer's email address
   * @param {Object} serviceRequest - Service request details
   * @returns {Promise<Object>} - Email sending result
   */
  async sendOrderConfirmationEmail(email, serviceRequest) {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const customerName = serviceRequest.user_name || "Customer";
    const serviceName = serviceRequest.service_name || "Service";
    const categoryName = serviceRequest.category_name || "Category";
    const requestDate = serviceRequest.requested_date
      ? new Date(serviceRequest.requested_date).toLocaleDateString("en-AE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "TBD";
    const requestType = serviceRequest.request_type || "Service Request";
    const address = serviceRequest.address || "N/A";
    const orderId = serviceRequest._id || "N/A";
    const paymentMethod = serviceRequest.paymentMethod || "Cash On Delivery";
    const numberOfUnits = serviceRequest.number_of_units || 1;
    const unitType = serviceRequest.unit_type || "unit";
    const unitPrice = serviceRequest.unit_price;
    const totalPrice = serviceRequest.total_price;
    const message = serviceRequest.message || "";

    // Format sub-services if available
    let subServicesHtml = "";
    let subServicesText = "";
    if (
      serviceRequest.selectedSubServices &&
      serviceRequest.selectedSubServices.length > 0
    ) {
      subServicesHtml = `
        <tr>
          <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Selected Services:</strong></td>
          <td style="padding: 8px 0; color: #333;">
            <ul style="margin: 0; padding-left: 20px;">
              ${serviceRequest.selectedSubServices
                .map(
                  (sub) =>
                    `<li>${sub.name} (Qty: ${sub.quantity || 1}) - AED ${(sub.rate * (sub.quantity || 1)).toFixed(2)}</li>`,
                )
                .join("")}
            </ul>
          </td>
        </tr>
      `;
      subServicesText = `Selected Services:\n${serviceRequest.selectedSubServices
        .map(
          (sub) =>
            `  - ${sub.name} (Qty: ${sub.quantity || 1}) - AED ${(sub.rate * (sub.quantity || 1)).toFixed(2)}`,
        )
        .join("\n")}`;
    }

    // Format discount if available
    let discountHtml = "";
    let discountText = "";
    if (serviceRequest.discountPercentage && serviceRequest.discountAmount) {
      discountHtml = `
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Discount (${serviceRequest.discountPercentage}%):</strong></td>
          <td style="padding: 8px 0; color: #28a745;">-AED ${serviceRequest.discountAmount.toFixed(2)}</td>
        </tr>
      `;
      discountText = `Discount (${serviceRequest.discountPercentage}%): -AED ${serviceRequest.discountAmount.toFixed(2)}`;
    }

    const subject = `Order Confirmation - ${serviceName} #${orderId.toString().slice(-6).toUpperCase()}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <img src="https://mynazam-s3.s3.us-east-1.amazonaws.com/uploads/1769798856545-zush-logo-latest.png" alt="Zush" style="max-width: 150px; height: auto;">
              <p style="color: #666; margin: 5px 0;">Your Trusted Service Partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="background-color: #28a745; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-block; line-height: 60px; font-size: 30px;">✓</div>
                      <h2 style="color: #28a745; margin: 15px 0 5px 0;">Order Confirmed!</h2>
                      <p style="color: #666; margin: 0;">Thank you for your order, ${customerName}</p>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
                      <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Order ID</p>
                      <p style="color: #333; margin: 0; font-size: 20px; font-weight: bold; font-family: monospace;">#${orderId.toString().slice(-8).toUpperCase()}</p>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #e7f5ff; border-left: 4px solid #007bff; border-radius: 4px;">
                      <h3 style="color: #333; margin-top: 0;">Service Details:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Category:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${categoryName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${serviceName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Request Type:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${requestType}</td>
                        </tr>
                        ${subServicesHtml}
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Quantity:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${numberOfUnits} ${unitType === "per_hour" ? "hour(s)" : "unit(s)"}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">Appointment Details:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Scheduled Date:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${requestDate}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Service Address:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${address}</td>
                        </tr>
                        ${
                          message
                            ? `
                        <tr>
                          <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Notes:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${message}</td>
                        </tr>
                        `
                            : ""
                        }
                      </table>
                    </div>

                    ${
                      requestType !== "Quotation" && totalPrice
                        ? `
                    <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-radius: 8px;">
                      <h3 style="color: #155724; margin-top: 0;">Payment Summary:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        ${
                          unitPrice
                            ? `
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Unit Price:</strong></td>
                          <td style="padding: 8px 0; color: #155724;">AED ${unitPrice.toFixed(2)}</td>
                        </tr>
                        `
                            : ""
                        }
                        ${discountHtml}
                        <tr style="border-top: 2px solid #28a745;">
                          <td style="padding: 12px 0; color: #155724; font-size: 18px;"><strong>Total Amount:</strong></td>
                          <td style="padding: 12px 0; color: #155724; font-size: 18px;"><strong>AED ${totalPrice.toFixed(2)}</strong></td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Payment Method:</strong></td>
                          <td style="padding: 8px 0; color: #155724;">${paymentMethod}</td>
                        </tr>
                      </table>
                    </div>
                    `
                        : `
                    <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-radius: 8px;">
                      <p style="color: #856404; margin: 0;">
                        <strong>Quotation Request:</strong> Our team will contact you shortly with a detailed quote.
                      </p>
                    </div>
                    `
                    }

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">What Happens Next?</h3>
                      <ol style="color: #666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                        <li>Our team will review your order and assign a professional vendor</li>
                        <li>You will receive a notification once a vendor is assigned</li>
                        <li>The vendor will contact you to confirm the appointment</li>
                        <li>Enjoy your service!</li>
                      </ol>
                    </div>

                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      If you have any questions about your order, please don't hesitate to contact our support team.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                Need help? Contact us at info@zushh.com
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
Order Confirmation - ZUSH

Thank you for your order, ${customerName}!

Order ID: #${orderId.toString().slice(-8).toUpperCase()}

Service Details:
- Category: ${categoryName}
- Service: ${serviceName}
- Request Type: ${requestType}
${subServicesText ? subServicesText + "\n" : ""}- Quantity: ${numberOfUnits} ${unitType === "per_hour" ? "hour(s)" : "unit(s)"}

Appointment Details:
- Scheduled Date: ${requestDate}
- Service Address: ${address}
${message ? `- Notes: ${message}\n` : ""}
${
  requestType !== "Quotation" && totalPrice
    ? `
Payment Summary:
${unitPrice ? `- Unit Price: AED ${unitPrice.toFixed(2)}\n` : ""}${discountText ? discountText + "\n" : ""}- Total Amount: AED ${totalPrice.toFixed(2)}
- Payment Method: ${paymentMethod}
`
    : `
Quotation Request: Our team will contact you shortly with a detailed quote.
`
}
What Happens Next?
1. Our team will review your order and assign a professional vendor
2. You will receive a notification once a vendor is assigned
3. The vendor will contact you to confirm the appointment
4. Enjoy your service!

If you have any questions about your order, please don't hesitate to contact our support team.

Best regards,
The ZUSH Team

© ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
Need help? Contact us at info@zushh.com
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send password reset OTP email
   * @param {string} email - User's email address
   * @param {string} otpCode - 6-digit OTP code
   * @param {string} userName - User's name
   * @returns {Promise<Object>} - Email sending result
   */
  async sendPasswordResetOTP(email, otpCode, userName = "User") {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const subject = "ZUSH - Password Reset Verification Code";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <h1 style="color: #333; margin: 0;">ZUSH</h1>
              <p style="color: #666; margin: 5px 0;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #333; margin-top: 0;">Hello ${userName},</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password for your ZUSH account.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Your password reset verification code is:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <div style="background-color: #007bff; color: white; font-size: 32px; font-weight: bold;
                                 padding: 20px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">
                        ${otpCode}
                      </div>
                    </div>
                    <p style="color: #666; font-size: 14px; margin: 20px 0;">
                      This code will expire in <strong>5 minutes</strong>.
                    </p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                      <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>Security Notice:</strong>
                      </p>
                      <ul style="color: #856404; font-size: 14px; margin: 10px 0; padding-left: 20px;">
                        <li>Do not share this code with anyone</li>
                        <li>ZUSH will never ask for your verification code</li>
                        <li>If you didn't request this, please ignore this email or contact support</li>
                      </ul>
                    </div>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
ZUSH - Password Reset Request

Hello ${userName},

We received a request to reset your password for your ZUSH account.

Your password reset verification code is: ${otpCode}

This code will expire in 5 minutes.

Security Notice:
- Do not share this code with anyone
- ZUSH will never ask for your verification code
- If you didn't request this, please ignore this email or contact support

Best regards,
The ZUSH Team

© ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send payment link email to customer
   * @param {string} email - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {Object} serviceRequest - Service request details
   * @param {string} paymentLink - Payment link URL
   * @param {Date} expiresAt - Link expiry date
   * @returns {Promise<Object>} - Email sending result
   */
  async sendPaymentLinkEmail(
    email,
    customerName,
    serviceRequest,
    paymentLink,
    expiresAt,
  ) {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const serviceName = serviceRequest.service_name || "Service";
    const totalPrice = serviceRequest.total_price || 0;
    const orderId = serviceRequest._id?.toString() || "N/A";
    const expiryDate = expiresAt
      ? new Date(expiresAt).toLocaleString("en-AE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

    const subject = `Payment Link for Your ${serviceName} Order - ZUSH`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Link</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <img src="https://mynazam-s3.s3.us-east-1.amazonaws.com/uploads/1769798856545-zush-logo-latest.png" alt="Zush" style="max-width: 150px; height: auto;">
              <p style="color: #666; margin: 5px 0;">Your Trusted Service Partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #333; margin-top: 0;">Hello ${customerName},</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Your payment link for the service request is ready. Please complete your payment using the link below.
                    </p>

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">Order Details:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Order ID:</strong></td>
                          <td style="padding: 8px 0; color: #333;">#${orderId.slice(-8).toUpperCase()}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${serviceName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Amount:</strong></td>
                          <td style="padding: 8px 0; color: #333; font-weight: bold; font-size: 18px;">AED ${totalPrice.toFixed(2)}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${paymentLink}" style="background-color: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
                        Pay Now
                      </a>
                    </div>

                    <div style="margin: 30px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                      <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>Link Expires:</strong> ${expiryDate}
                      </p>
                    </div>

                    <p style="color: #666; font-size: 14px; line-height: 1.6;">
                      If the button doesn't work, copy and paste this link in your browser:<br>
                      <a href="${paymentLink}" style="color: #007bff; word-break: break-all;">${paymentLink}</a>
                    </p>

                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                Need help? Contact us at info@zushh.com
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
Hello ${customerName},

Your payment link for the service request is ready. Please complete your payment using the link below.

Order Details:
- Order ID: #${orderId.slice(-8).toUpperCase()}
- Service: ${serviceName}
- Amount: AED ${totalPrice.toFixed(2)}

Payment Link: ${paymentLink}

Link Expires: ${expiryDate}

Best regards,
The ZUSH Team

Need help? Contact us at info@zushh.com
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send milestone payment link email to customer
   * @param {string} email - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {Object} serviceRequest - Service request details
   * @param {Object} milestone - Milestone details
   * @param {string} paymentLink - Payment link URL
   * @param {Date} expiresAt - Link expiry date
   * @returns {Promise<Object>} - Email sending result
   */
  async sendMilestonePaymentLinkEmail(
    email,
    customerName,
    serviceRequest,
    milestone,
    paymentLink,
    expiresAt,
  ) {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const serviceName = serviceRequest.service_name || "Service";
    const milestoneName = milestone.name || "Milestone";
    const milestoneAmount = milestone.amount || 0;
    const milestoneOrder = milestone.order || 1;
    const totalMilestones = serviceRequest.milestones?.length || 1;
    const orderId = serviceRequest._id?.toString() || "N/A";
    const expiryDate = expiresAt
      ? new Date(expiresAt).toLocaleString("en-AE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

    const subject = `Payment Link for ${milestoneName} (Milestone ${milestoneOrder}/${totalMilestones}) - ZUSH`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Milestone Payment Link</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <img src="https://mynazam-s3.s3.us-east-1.amazonaws.com/uploads/1769798856545-zush-logo-latest.png" alt="Zush" style="max-width: 150px; height: auto;">
              <p style="color: #666; margin: 5px 0;">Your Trusted Service Partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #333; margin-top: 0;">Hello ${customerName},</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Your milestone payment link is ready. Please complete this payment to proceed with your service.
                    </p>

                    <div style="margin: 30px 0; padding: 20px; background-color: #e7f5ff; border-left: 4px solid #007bff; border-radius: 4px;">
                      <h3 style="color: #333; margin-top: 0;">Service Details:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Order ID:</strong></td>
                          <td style="padding: 8px 0; color: #333;">#${orderId.slice(-8).toUpperCase()}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${serviceName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Total Price:</strong></td>
                          <td style="padding: 8px 0; color: #333;">AED ${(serviceRequest.total_price || 0).toFixed(2)}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-radius: 8px;">
                      <h3 style="color: #155724; margin-top: 0;">Milestone Payment:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Milestone:</strong></td>
                          <td style="padding: 8px 0; color: #155724;">${milestoneName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Progress:</strong></td>
                          <td style="padding: 8px 0; color: #155724;">Step ${milestoneOrder} of ${totalMilestones}</td>
                        </tr>
                        ${
                          milestone.description
                            ? `
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Description:</strong></td>
                          <td style="padding: 8px 0; color: #155724;">${milestone.description}</td>
                        </tr>
                        `
                            : ""
                        }
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Amount Due:</strong></td>
                          <td style="padding: 8px 0; color: #155724; font-weight: bold; font-size: 20px;">AED ${milestoneAmount.toFixed(2)}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${paymentLink}" style="background-color: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
                        Pay Milestone
                      </a>
                    </div>

                    <div style="margin: 30px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                      <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>Link Expires:</strong> ${expiryDate}
                      </p>
                    </div>

                    <p style="color: #666; font-size: 14px; line-height: 1.6;">
                      If the button doesn't work, copy and paste this link in your browser:<br>
                      <a href="${paymentLink}" style="color: #007bff; word-break: break-all;">${paymentLink}</a>
                    </p>

                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                Need help? Contact us at info@zushh.com
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
Hello ${customerName},

Your milestone payment link is ready. Please complete this payment to proceed with your service.

Service Details:
- Order ID: #${orderId.slice(-8).toUpperCase()}
- Service: ${serviceName}
- Total Price: AED ${(serviceRequest.total_price || 0).toFixed(2)}

Milestone Payment:
- Milestone: ${milestoneName}
- Progress: Step ${milestoneOrder} of ${totalMilestones}
${milestone.description ? `- Description: ${milestone.description}\n` : ""}- Amount Due: AED ${milestoneAmount.toFixed(2)}

Payment Link: ${paymentLink}

Link Expires: ${expiryDate}

Best regards,
The ZUSH Team

Need help? Contact us at info@zushh.com
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send payment success confirmation email
   * @param {string} email - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {Object} serviceRequest - Service request details
   * @param {Object} paymentDetails - Payment details (transactionId, amount, etc.)
   * @param {Object} milestone - Optional milestone details for milestone payments
   * @returns {Promise<Object>} - Email sending result
   */
  async sendPaymentSuccessEmail(
    email,
    customerName,
    serviceRequest,
    paymentDetails,
    milestone = null,
  ) {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const serviceName = serviceRequest.service_name || "Service";
    const orderId = serviceRequest._id?.toString() || "N/A";
    const transactionId =
      paymentDetails.transactionId || paymentDetails.tracking_id || "N/A";
    const amount = paymentDetails.amount || 0;
    const paymentDate = paymentDetails.paymentDate
      ? new Date(paymentDetails.paymentDate).toLocaleString("en-AE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleString("en-AE");

    const isMilestonePayment = milestone !== null;
    const subject = isMilestonePayment
      ? `Payment Confirmed: ${milestone.name} - ZUSH`
      : `Payment Confirmed for Your ${serviceName} Order - ZUSH`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <img src="https://mynazam-s3.s3.us-east-1.amazonaws.com/uploads/1769798856545-zush-logo-latest.png" alt="Zush" style="max-width: 150px; height: auto;">
              <p style="color: #666; margin: 5px 0;">Your Trusted Service Partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="background-color: #28a745; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-block; line-height: 60px; font-size: 30px;">&#10003;</div>
                      <h2 style="color: #28a745; margin: 15px 0 5px 0;">Payment Successful!</h2>
                      <p style="color: #666; margin: 0;">Thank you for your payment, ${customerName}</p>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-radius: 8px;">
                      <h3 style="color: #155724; margin-top: 0;">Payment Details:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Transaction ID:</strong></td>
                          <td style="padding: 8px 0; color: #155724; font-family: monospace;">${transactionId}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Amount Paid:</strong></td>
                          <td style="padding: 8px 0; color: #155724; font-weight: bold; font-size: 18px;">AED ${amount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Payment Date:</strong></td>
                          <td style="padding: 8px 0; color: #155724;">${paymentDate}</td>
                        </tr>
                        ${
                          paymentDetails.bankReferenceNumber
                            ? `
                        <tr>
                          <td style="padding: 8px 0; color: #155724;"><strong>Bank Reference:</strong></td>
                          <td style="padding: 8px 0; color: #155724;">${paymentDetails.bankReferenceNumber}</td>
                        </tr>
                        `
                            : ""
                        }
                      </table>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">Order Details:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Order ID:</strong></td>
                          <td style="padding: 8px 0; color: #333;">#${orderId.slice(-8).toUpperCase()}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${serviceName}</td>
                        </tr>
                        ${
                          isMilestonePayment
                            ? `
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Milestone:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${milestone.name} (Step ${milestone.order})</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Total Order Value:</strong></td>
                          <td style="padding: 8px 0; color: #333;">AED ${(serviceRequest.total_price || 0).toFixed(2)}</td>
                        </tr>
                        `
                            : `
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Total Price:</strong></td>
                          <td style="padding: 8px 0; color: #333;">AED ${(serviceRequest.total_price || 0).toFixed(2)}</td>
                        </tr>
                        `
                        }
                      </table>
                    </div>

                    ${
                      isMilestonePayment
                        ? `
                    <div style="margin: 30px 0; padding: 20px; background-color: #e7f5ff; border-left: 4px solid #007bff; border-radius: 4px;">
                      <p style="color: #004085; margin: 0; font-size: 14px;">
                        <strong>Note:</strong> This is a milestone payment. You may have additional payments remaining for this service.
                      </p>
                    </div>
                    `
                        : ""
                    }

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">What Happens Next?</h3>
                      <ol style="color: #666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                        ${
                          isMilestonePayment
                            ? `
                        <li>Work on this milestone will begin shortly</li>
                        <li>You will be notified when this milestone is completed</li>
                        <li>Payment links for remaining milestones will be sent as work progresses</li>
                        `
                            : `
                        <li>Our team will process your order</li>
                        <li>A vendor will be assigned to your service request</li>
                        <li>The vendor will contact you to confirm the appointment</li>
                        `
                        }
                      </ol>
                    </div>

                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      If you have any questions, please don't hesitate to contact our support team.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                Need help? Contact us at info@zushh.com
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
Payment Successful!

Thank you for your payment, ${customerName}

Payment Details:
- Transaction ID: ${transactionId}
- Amount Paid: AED ${amount.toFixed(2)}
- Payment Date: ${paymentDate}
${paymentDetails.bankReferenceNumber ? `- Bank Reference: ${paymentDetails.bankReferenceNumber}\n` : ""}
Order Details:
- Order ID: #${orderId.slice(-8).toUpperCase()}
- Service: ${serviceName}
${
  isMilestonePayment
    ? `- Milestone: ${milestone.name} (Step ${milestone.order})
- Total Order Value: AED ${(serviceRequest.total_price || 0).toFixed(2)}`
    : `- Total Price: AED ${(serviceRequest.total_price || 0).toFixed(2)}`
}

${isMilestonePayment ? "Note: This is a milestone payment. You may have additional payments remaining for this service." : ""}

What Happens Next?
${
  isMilestonePayment
    ? `1. Work on this milestone will begin shortly
2. You will be notified when this milestone is completed
3. Payment links for remaining milestones will be sent as work progresses`
    : `1. Our team will process your order
2. A vendor will be assigned to your service request
3. The vendor will contact you to confirm the appointment`
}

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The ZUSH Team

Need help? Contact us at info@zushh.com
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Send payment failure notification email
   * @param {string} email - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {Object} serviceRequest - Service request details
   * @param {string} failureReason - Reason for payment failure
   * @param {Object} milestone - Optional milestone details for milestone payments
   * @returns {Promise<Object>} - Email sending result
   */
  async sendPaymentFailureEmail(
    email,
    customerName,
    serviceRequest,
    failureReason,
    milestone = null,
  ) {
    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    const serviceName = serviceRequest.service_name || "Service";
    const orderId = serviceRequest._id?.toString() || "N/A";
    const isMilestonePayment = milestone !== null;

    const subject = isMilestonePayment
      ? `Payment Failed: ${milestone.name} - Action Required`
      : `Payment Failed for Your ${serviceName} Order - Action Required`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <img src="https://mynazam-s3.s3.us-east-1.amazonaws.com/uploads/1769798856545-zush-logo-latest.png" alt="Zush" style="max-width: 150px; height: auto;">
              <p style="color: #666; margin: 5px 0;">Your Trusted Service Partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                <tr>
                  <td>
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="background-color: #dc3545; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-block; line-height: 60px; font-size: 30px;">!</div>
                      <h2 style="color: #dc3545; margin: 15px 0 5px 0;">Payment Failed</h2>
                      <p style="color: #666; margin: 0;">We couldn't process your payment, ${customerName}</p>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8d7da; border-radius: 8px;">
                      <h3 style="color: #721c24; margin-top: 0;">What Happened:</h3>
                      <p style="color: #721c24; margin: 0;">${failureReason || "Your payment could not be processed. Please try again."}</p>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                      <h3 style="color: #333; margin-top: 0;">Order Details:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Order ID:</strong></td>
                          <td style="padding: 8px 0; color: #333;">#${orderId.slice(-8).toUpperCase()}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${serviceName}</td>
                        </tr>
                        ${
                          isMilestonePayment
                            ? `
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Milestone:</strong></td>
                          <td style="padding: 8px 0; color: #333;">${milestone.name}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Amount:</strong></td>
                          <td style="padding: 8px 0; color: #333;">AED ${(milestone.amount || 0).toFixed(2)}</td>
                        </tr>
                        `
                            : `
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Amount:</strong></td>
                          <td style="padding: 8px 0; color: #333;">AED ${(serviceRequest.total_price || 0).toFixed(2)}</td>
                        </tr>
                        `
                        }
                      </table>
                    </div>

                    <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-radius: 8px;">
                      <h3 style="color: #856404; margin-top: 0;">Common Reasons for Payment Failure:</h3>
                      <ul style="color: #856404; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                        <li>Insufficient funds in your account</li>
                        <li>Card details entered incorrectly</li>
                        <li>Card expired or blocked</li>
                        <li>Transaction limit exceeded</li>
                        <li>Bank declined the transaction</li>
                      </ul>
                    </div>

                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Please contact our support team to get a new payment link, or if you need any assistance.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The ZUSH Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} Nazam Software Design LLC. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                Need help? Contact us at info@zushh.com
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
Payment Failed

We couldn't process your payment, ${customerName}

What Happened:
${failureReason || "Your payment could not be processed. Please try again."}

Order Details:
- Order ID: #${orderId.slice(-8).toUpperCase()}
- Service: ${serviceName}
${
  isMilestonePayment
    ? `- Milestone: ${milestone.name}
- Amount: AED ${(milestone.amount || 0).toFixed(2)}`
    : `- Amount: AED ${(serviceRequest.total_price || 0).toFixed(2)}`
}

Common Reasons for Payment Failure:
- Insufficient funds in your account
- Card details entered incorrectly
- Card expired or blocked
- Transaction limit exceeded
- Bank declined the transaction

Please contact our support team to get a new payment link, or if you need any assistance.

Best regards,
The ZUSH Team

Need help? Contact us at info@zushh.com
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text,
    });
  }

  /**
   * Test email configuration
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    try {
      if (!this.transporter) {
        return {
          success: false,
          message:
            "Email service not configured. Please set email credentials in environment variables.",
          troubleshooting: [
            "Set EMAIL_USER and EMAIL_PASS in your .env file",
            "For Microsoft 365, you may need to use an App Password instead of your regular password",
            "Ensure SMTP authentication is enabled for your mailbox",
          ],
        };
      }

      await this.transporter.verify();
      return {
        success: true,
        message: "Email service is configured correctly",
      };
    } catch (error) {
      let troubleshooting = [];

      // Check for specific Microsoft 365 SMTP authentication errors
      if (
        error.message &&
        error.message.includes("SmtpClientAuthentication is disabled")
      ) {
        troubleshooting = [
          "SMTP authentication is disabled for your Microsoft 365 mailbox",
          "To enable SMTP AUTH:",
          "  1. Log in to Microsoft 365 Admin Center (admin.microsoft.com)",
          "  2. Go to Settings > Mail > Mailboxes",
          "  3. Select the mailbox (info@zushh.com)",
          '  4. Enable "SMTP AUTH" in the mailbox settings',
          "  5. Alternatively, use an App Password instead of your regular password",
          "  6. For GoDaddy Microsoft 365, contact GoDaddy support to enable SMTP authentication",
          "",
          "Or use an App Password:",
          "  1. Go to account.microsoft.com/security",
          "  2. Enable two-factor authentication if not already enabled",
          "  3. Go to Security > Advanced security options",
          "  4. Create a new App Password",
          "  5. Use this App Password in EMAIL_PASS instead of your regular password",
        ];
      } else if (error.message && error.message.includes("Invalid login")) {
        troubleshooting = [
          "Invalid login credentials",
          "For Microsoft 365, try using an App Password instead of your regular password",
          "To create an App Password:",
          "  1. Go to account.microsoft.com/security",
          "  2. Enable two-factor authentication",
          "  3. Create a new App Password",
          "  4. Use this App Password in EMAIL_PASS",
        ];
      } else {
        troubleshooting = [
          "Check your EMAIL_USER and EMAIL_PASS in .env file",
          "Verify SMTP settings:",
          `  - Host: ${process.env.EMAIL_HOST || "smtp.office365.com"}`,
          `  - Port: ${process.env.EMAIL_PORT || "587"}`,
          "For Microsoft 365, ensure SMTP authentication is enabled",
          "Consider using an App Password for better security",
        ];
      }

      return {
        success: false,
        message: `Email service configuration error: ${error.message}`,
        troubleshooting: troubleshooting,
        errorCode: error.code,
        command: error.command,
      };
    }
  }
}

module.exports = new EmailService();

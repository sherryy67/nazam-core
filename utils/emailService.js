const nodemailer = require('nodemailer');

/**
 * Comprehensive Email Service for Zushh
 * Uses Microsoft 365/Outlook SMTP (GoDaddy Microsoft)
 * Handles: Account creation, service assignments, admin notifications, and marketing emails
 */
class EmailService {
  constructor() {
    // Microsoft 365/Outlook SMTP Configuration
    const emailUser = process.env.EMAIL_USER || process.env.Email || 'info@zushh.com';
    const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || process.env.Password;
    const emailFrom = process.env.EMAIL_FROM || 'info@zushh.com';
    const smtpHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.office365.com';
    const smtpPort = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587');
    
    this.emailFrom = emailFrom;
    
    if (!emailPass) {
      console.warn('⚠️  Email password not found in environment variables. Email service will not work.');
      console.warn('Please set EMAIL_PASS, EMAIL_PASSWORD, or Password in your .env file');
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
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      },
      // Additional options for better compatibility
      requireTLS: true,
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000
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
        throw new Error('Email service not configured. Please set email credentials in environment variables.');
      }

      const result = await this.transporter.sendMail({
        from: this.emailFrom,
        ...mailOptions
      });

      console.log('Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('Email Service Error:', error.message);
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
      throw new Error('Invalid email format');
    }

    const subject = 'Welcome to Zushh!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Zushh</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <h1 style="color: #333; margin: 0;">Zushh</h1>
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
                      Thank you for creating your account with Zushh. We're excited to have you on board!
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      With Zushh, you can easily request services, track your orders, and connect with trusted vendors in your area.
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
                      <strong>The Zushh Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Zushh. All rights reserved.
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
Welcome to Zushh!

Thank you for creating your account with Zushh, ${name}. We're excited to have you on board!

With Zushh, you can easily request services, track your orders, and connect with trusted vendors in your area.

What you can do:
- Request services from our wide range of offerings
- Track your service requests in real-time
- Get connected with professional vendors
- Manage your account and preferences

If you have any questions or need assistance, feel free to contact our support team.

Best regards,
The Zushh Team

© ${new Date().getFullYear()} Zushh. All rights reserved.
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text
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
      throw new Error('Invalid email format');
    }

    const vendorName = vendor ? `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() : 'Assigned Vendor';
    const serviceName = serviceRequest.service_name || 'Service';
    const requestDate = serviceRequest.requested_date ? new Date(serviceRequest.requested_date).toLocaleDateString() : 'TBD';
    const requestType = serviceRequest.request_type || 'Service Request';

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
              <h1 style="color: #333; margin: 0;">Zushh</h1>
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
                        ${serviceRequest.total_price ? `
                        <tr>
                          <td style="padding: 8px 0; color: #666;"><strong>Total Price:</strong></td>
                          <td style="padding: 8px 0; color: #333;">AED ${serviceRequest.total_price.toFixed(2)}</td>
                        </tr>
                        ` : ''}
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
                      <strong>The Zushh Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Zushh. All rights reserved.
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
${serviceRequest.total_price ? `- Total Price: AED ${serviceRequest.total_price.toFixed(2)}` : ''}

Your assigned vendor will contact you soon to confirm the details and schedule.
You can track your service request status in your account dashboard.

Best regards,
The Zushh Team

© ${new Date().getFullYear()} Zushh. All rights reserved.
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text
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
      throw new Error('Invalid email format');
    }

    const customerName = serviceRequest.user_name || 'Customer';
    const serviceName = serviceRequest.service_name || 'Service';
    const customerEmail = serviceRequest.user_email || 'N/A';
    const customerPhone = serviceRequest.user_phone || 'N/A';
    const requestDate = serviceRequest.requested_date ? new Date(serviceRequest.requested_date).toLocaleDateString() : 'TBD';
    const requestType = serviceRequest.request_type || 'Service Request';
    const address = serviceRequest.address || 'N/A';
    const requestId = serviceRequest._id || serviceRequest.id || 'N/A';

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
              <h1 style="color: #333; margin: 0;">Zushh Admin</h1>
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
                    ${serviceRequest.total_price ? `
                    <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                      <p style="color: #333; margin: 0;"><strong>Total Price: AED ${serviceRequest.total_price.toFixed(2)}</strong></p>
                    </div>
                    ` : ''}
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Please review this request and assign it to an appropriate vendor.
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>Zushh System</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Zushh. All rights reserved.
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

${serviceRequest.total_price ? `Total Price: AED ${serviceRequest.total_price.toFixed(2)}` : ''}

Please review this request and assign it to an appropriate vendor.

Best regards,
Zushh System

© ${new Date().getFullYear()} Zushh. All rights reserved.
    `;

    return await this.sendEmail({
      to: adminEmail,
      subject: subject,
      html: html,
      text: text
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
  async sendMarketingEmail(recipients, subject, message, title = 'Important Update from Zushh') {
    // Validate recipients
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];
    const validRecipients = recipientList.filter(email => this.isValidEmail(email));
    
    if (validRecipients.length === 0) {
      throw new Error('No valid email addresses provided');
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
              <h1 style="color: #333; margin: 0;">Zushh</h1>
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
                      ${message.replace(/\n/g, '<br>')}
                    </div>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                      Best regards,<br>
                      <strong>The Zushh Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Zushh. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                You are receiving this email because you are a registered user of Zushh.
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
          text: message
        });
        results.push({ recipient, success: true, ...result });
      } catch (error) {
        results.push({ recipient, success: false, error: error.message });
      }
    }

    return {
      success: results.every(r => r.success),
      results: results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
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
      throw new Error('Invalid email format');
    }

    const subject = 'Zushh - Verification Code';
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
              <h1 style="color: #333; margin: 0;">Zushh</h1>
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
                      Your Zushh verification code is:
                    </p>
                    <div style="background-color: #007bff; color: white; font-size: 32px; font-weight: bold; 
                               padding: 20px; border-radius: 8px; letter-spacing: 5px; margin: 20px 0; display: inline-block;">
                      ${otpCode}
                    </div>
                    <p style="color: #666; font-size: 14px; margin: 20px 0;">
                      This code will expire in <strong>5 minutes</strong>.
                    </p>
                    <p style="color: #dc3545; font-size: 14px; margin: 20px 0;">
                      <strong>Important:</strong> Do not share this code with anyone. Zushh will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #ffffff;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Zushh. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
Zushh - Verification Code

Your Zushh verification code is: ${otpCode}

This code will expire in 5 minutes.

Important: Do not share this code with anyone. Zushh will never ask for your verification code.

If you didn't request this code, please ignore this email.

© ${new Date().getFullYear()} Zushh. All rights reserved.
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: text
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
          message: 'Email service not configured. Please set email credentials in environment variables.',
          troubleshooting: [
            'Set EMAIL_USER and EMAIL_PASS in your .env file',
            'For Microsoft 365, you may need to use an App Password instead of your regular password',
            'Ensure SMTP authentication is enabled for your mailbox'
          ]
        };
      }
      
      await this.transporter.verify();
      return {
        success: true,
        message: 'Email service is configured correctly'
      };
    } catch (error) {
      let troubleshooting = [];
      
      // Check for specific Microsoft 365 SMTP authentication errors
      if (error.message && error.message.includes('SmtpClientAuthentication is disabled')) {
        troubleshooting = [
          'SMTP authentication is disabled for your Microsoft 365 mailbox',
          'To enable SMTP AUTH:',
          '  1. Log in to Microsoft 365 Admin Center (admin.microsoft.com)',
          '  2. Go to Settings > Mail > Mailboxes',
          '  3. Select the mailbox (info@zushh.com)',
          '  4. Enable "SMTP AUTH" in the mailbox settings',
          '  5. Alternatively, use an App Password instead of your regular password',
          '  6. For GoDaddy Microsoft 365, contact GoDaddy support to enable SMTP authentication',
          '',
          'Or use an App Password:',
          '  1. Go to account.microsoft.com/security',
          '  2. Enable two-factor authentication if not already enabled',
          '  3. Go to Security > Advanced security options',
          '  4. Create a new App Password',
          '  5. Use this App Password in EMAIL_PASS instead of your regular password'
        ];
      } else if (error.message && error.message.includes('Invalid login')) {
        troubleshooting = [
          'Invalid login credentials',
          'For Microsoft 365, try using an App Password instead of your regular password',
          'To create an App Password:',
          '  1. Go to account.microsoft.com/security',
          '  2. Enable two-factor authentication',
          '  3. Create a new App Password',
          '  4. Use this App Password in EMAIL_PASS'
        ];
      } else {
        troubleshooting = [
          'Check your EMAIL_USER and EMAIL_PASS in .env file',
          'Verify SMTP settings:',
          `  - Host: ${process.env.EMAIL_HOST || 'smtp.office365.com'}`,
          `  - Port: ${process.env.EMAIL_PORT || '587'}`,
          'For Microsoft 365, ensure SMTP authentication is enabled',
          'Consider using an App Password for better security'
        ];
      }
      
      return {
        success: false,
        message: `Email service configuration error: ${error.message}`,
        troubleshooting: troubleshooting,
        errorCode: error.code,
        command: error.command
      };
    }
  }
}

module.exports = new EmailService();

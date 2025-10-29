const nodemailer = require('nodemailer');

/**
 * Email Service for sending OTP and notifications
 * Handles email sending using Gmail SMTP
 */
class EmailService {
  constructor() {
    // Check if email credentials are available
    const emailUser = process.env.Email || 'sheralii10711@gmail.com';
    const emailPass = process.env.Password || process.env.EMAIL_PASSWORD;
    
    if (!emailPass) {
      console.warn('⚠️  Email password not found in environment variables. Email OTP will not work.');
      console.warn('Please set Password or EMAIL_PASSWORD in your .env file');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  /**
   * Send OTP email to user
   * @param {string} email - User's email address
   * @param {string} otpCode - 6-digit OTP code
   * @returns {Promise<Object>} - Email sending result
   */
  async sendOTP(email, otpCode) {
    try {
      // Check if transporter is available
      if (!this.transporter) {
        throw new Error('Email service not configured. Please set email credentials in environment variables.');
      }

      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      const mailOptions = {
        from: process.env.Email || 'sheralii10711@gmail.com',
        to: email,
        subject: 'Nazam - Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin: 0;">Nazam</h1>
              <p style="color: #666; margin: 5px 0;">Service Management Platform</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
              <h2 style="color: #333; margin-bottom: 20px;">Verification Code</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 25px;">
                Your Nazam verification code is:
              </p>
              
              <div style="background-color: #007bff; color: white; font-size: 32px; font-weight: bold; 
                         padding: 20px; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
                ${otpCode}
              </div>
              
              <p style="color: #666; font-size: 14px; margin: 20px 0;">
                This code will expire in <strong>5 minutes</strong>.
              </p>
              
              <p style="color: #dc3545; font-size: 14px; margin: 20px 0;">
                <strong>Important:</strong> Do not share this code with anyone. Nazam will never ask for your verification code.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                If you didn't request this code, please ignore this email.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                © 2024 Nazam. All rights reserved.
              </p>
            </div>
          </div>
        `,
        text: `
          Nazam - Verification Code
          
          Your Nazam verification code is: ${otpCode}
          
          This code will expire in 5 minutes.
          
          Important: Do not share this code with anyone. Nazam will never ask for your verification code.
          
          If you didn't request this code, please ignore this email.
          
          © 2024 Nazam. All rights reserved.
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'OTP sent successfully via email'
      };
    } catch (error) {
      console.error('Email Service Error:', error.message);
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }

  /**
   * Send notification email
   * @param {string} email - User's email address
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   * @returns {Promise<Object>} - Email sending result
   */
  async sendNotification(email, subject, message) {
    try {
      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      const mailOptions = {
        from: process.env.Email || 'sheralii10711@gmail.com',
        to: email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin: 0;">Nazam</h1>
              <p style="color: #666; margin: 5px 0;">Service Management Platform</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
              <div style="color: #666; font-size: 16px; line-height: 1.6;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2024 Nazam. All rights reserved.
              </p>
            </div>
          </div>
        `,
        text: message
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Notification sent successfully via email'
      };
    } catch (error) {
      console.error('Email Service Error:', error.message);
      throw new Error(`Failed to send notification email: ${error.message}`);
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - Is valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
          message: 'Email service not configured. Please set email credentials in environment variables.'
        };
      }
      
      await this.transporter.verify();
      return {
        success: true,
        message: 'Email service is configured correctly'
      };
    } catch (error) {
      return {
        success: false,
        message: `Email service configuration error: ${error.message}`
      };
    }
  }
}

module.exports = new EmailService();

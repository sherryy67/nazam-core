const { sendSuccess, sendError } = require('../utils/response');
const emailService = require('../utils/emailService');
const User = require('../models/User');

/**
 * @desc    Send marketing email to customers (Admin only)
 * @route   POST /api/email/marketing
 * @access  Private (Admin only)
 */
const sendMarketingEmail = async (req, res, next) => {
  try {
    const { recipients, subject, message, title } = req.body;

    // Validate required fields
    if (!recipients || !subject || !message) {
      return sendError(res, 400, 'Recipients, subject, and message are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate recipients is array or string
    if (!Array.isArray(recipients) && typeof recipients !== 'string') {
      return sendError(res, 400, 'Recipients must be an array of email addresses or a single email string', 'INVALID_RECIPIENTS');
    }

    // If recipients is 'all', get all active users' emails
    let recipientList = [];
    if (recipients === 'all' || (Array.isArray(recipients) && recipients.length === 1 && recipients[0] === 'all')) {
      const activeUsers = await User.find({ isActive: true, email: { $exists: true, $ne: '' } })
        .select('email')
        .lean();
      recipientList = activeUsers.map(user => user.email).filter(email => emailService.isValidEmail(email));
    } else {
      recipientList = Array.isArray(recipients) ? recipients : [recipients];
    }

    if (recipientList.length === 0) {
      return sendError(res, 400, 'No valid email addresses found', 'NO_VALID_RECIPIENTS');
    }

    // Send marketing email
    const result = await emailService.sendMarketingEmail(
      recipientList,
      subject,
      message,
      title || 'Important Update from Zushh'
    );

    if (result.success) {
      return sendSuccess(res, 200, 'Marketing email sent successfully', {
        totalRecipients: recipientList.length,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        results: result.results
      });
    } else {
      return sendError(res, 500, 'Failed to send some marketing emails', 'EMAIL_SEND_FAILED', {
        totalRecipients: recipientList.length,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        results: result.results
      });
    }
  } catch (error) {
    console.error('Error sending marketing email:', error);
    next(error);
  }
};

/**
 * @desc    Test email configuration and send test email
 * @route   POST /api/email/test
 * @access  Private (Admin only)
 */
const testEmail = async (req, res, next) => {
  try {
    const { testEmail: recipientEmail } = req.body;

    // Validate email if provided
    if (recipientEmail && !emailService.isValidEmail(recipientEmail)) {
      return sendError(res, 400, 'Invalid email address format', 'INVALID_EMAIL');
    }

    // Test email connection
    const connectionTest = await emailService.testConnection();
    
    if (!connectionTest.success) {
      return sendError(res, 500, 'Email service configuration error', 'EMAIL_CONFIG_ERROR', {
        connectionTest: connectionTest.message,
        troubleshooting: connectionTest.troubleshooting || [],
        errorCode: connectionTest.errorCode,
        command: connectionTest.command
      });
    }

    // If recipient email is provided, send a test email
    if (recipientEmail) {
      try {
        const testResult = await emailService.sendEmail({
          to: recipientEmail,
          subject: 'Zushh - Email Service Test',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Email Service Test</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
                    <h1 style="color: #333; margin: 0;">Zushh</h1>
                    <p style="color: #666; margin: 5px 0;">Email Service Test</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
                      <tr>
                        <td>
                          <h2 style="color: #28a745; margin-top: 0;">✓ Email Service Test Successful</h2>
                          <p style="color: #666; font-size: 16px; line-height: 1.6;">
                            This is a test email from the Zushh email service.
                          </p>
                          <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                            <p style="color: #155724; margin: 0;">
                              <strong>Email Configuration:</strong><br>
                              Host: ${process.env.EMAIL_HOST || 'smtp.office365.com'}<br>
                              Port: ${process.env.EMAIL_PORT || '587'}<br>
                              From: ${process.env.EMAIL_FROM || 'info@zushh.com'}<br>
                              Status: <strong>Connected and Working</strong>
                            </p>
                          </div>
                          <p style="color: #666; font-size: 16px; line-height: 1.6;">
                            If you received this email, it means your email service is properly configured and working correctly.
                          </p>
                          <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                            <strong>Test Details:</strong><br>
                            Test Time: ${new Date().toLocaleString()}<br>
                            Recipient: ${recipientEmail}
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
          `,
          text: `
Zushh - Email Service Test

✓ Email Service Test Successful

This is a test email from the Zushh email service.

Email Configuration:
- Host: ${process.env.EMAIL_HOST || 'smtp.office365.com'}
- Port: ${process.env.EMAIL_PORT || '587'}
- From: ${process.env.EMAIL_FROM || 'info@zushh.com'}
- Status: Connected and Working

If you received this email, it means your email service is properly configured and working correctly.

Test Details:
- Test Time: ${new Date().toLocaleString()}
- Recipient: ${recipientEmail}

© ${new Date().getFullYear()} Zushh. All rights reserved.
          `
        });

        return sendSuccess(res, 200, 'Email service test successful', {
          connectionTest: {
            success: true,
            message: connectionTest.message
          },
          testEmail: {
            success: true,
            messageId: testResult.messageId,
            recipient: recipientEmail,
            message: 'Test email sent successfully'
          }
        });
      } catch (emailError) {
        return sendError(res, 500, 'Email connection is OK but failed to send test email', 'EMAIL_SEND_FAILED', {
          connectionTest: {
            success: true,
            message: connectionTest.message
          },
          testEmail: {
            success: false,
            error: emailError.message
          }
        });
      }
    }

    // If no recipient email provided, just return connection test result
    return sendSuccess(res, 200, 'Email service connection test successful', {
      connectionTest: {
        success: true,
        message: connectionTest.message
      },
      note: 'No test email sent. Provide "testEmail" in request body to send a test email.'
    });
  } catch (error) {
    console.error('Error testing email service:', error);
    next(error);
  }
};

module.exports = {
  sendMarketingEmail,
  testEmail
};


const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'email-smtp.us-east-1.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports (587 uses STARTTLS)
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async (options) => {
  try {
    // Validate SMTP_FROM is set and is a valid email
    const smtpFrom = process.env.SMTP_FROM;
    if (!smtpFrom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpFrom)) {
      throw new Error('SMTP_FROM must be set to a valid verified email address in Amazon SES. Please set SMTP_FROM in your .env file.');
    }

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    });

    console.log("Email sent: " + info.messageId);
    return info;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

module.exports = { sendEmail, createTransporter };

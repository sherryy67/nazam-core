const { sendSuccess, sendError } = require('../utils/response');
const emailService = require('../utils/emailService');

/**
 * @desc    Handle contact us form submission
 * @route   POST /api/contact
 * @access  Public
 */
const submitContactForm = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !subject || !message) {
      return sendError(res, 400, 'All fields are required (firstName, lastName, email, phone, subject, message)', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate email format
    if (!emailService.isValidEmail(email)) {
      return sendError(res, 400, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^[\+]?[\d]{7,16}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return sendError(res, 400, 'Please provide a valid phone number (7-16 digits)', 'INVALID_PHONE');
    }

    // Validate field lengths
    if (firstName.length < 2 || firstName.length > 50) {
      return sendError(res, 400, 'First name must be between 2 and 50 characters', 'INVALID_FIRST_NAME');
    }

    if (lastName.length < 2 || lastName.length > 50) {
      return sendError(res, 400, 'Last name must be between 2 and 50 characters', 'INVALID_LAST_NAME');
    }

    if (subject.length < 5 || subject.length > 100) {
      return sendError(res, 400, 'Subject must be between 5 and 100 characters', 'INVALID_SUBJECT');
    }

    if (message.length < 10 || message.length > 2000) {
      return sendError(res, 400, 'Message must be between 10 and 2000 characters', 'INVALID_MESSAGE');
    }

    // Send contact email to admin
    const result = await emailService.sendContactEmail({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      subject: subject.trim(),
      message: message.trim()
    });

    if (result.success) {
      return sendSuccess(res, 200, 'Your message has been sent successfully. We will get back to you soon!', {
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      });
    } else {
      return sendError(res, 500, 'Failed to send your message. Please try again later.', 'EMAIL_SEND_FAILED');
    }
  } catch (error) {
    console.error('Error submitting contact form:', error);
    next(error);
  }
};

module.exports = {
  submitContactForm
};

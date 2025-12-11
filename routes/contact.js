const express = require('express');
const { body } = require('express-validator');
const { submitContactForm } = require('../controllers/contactController');

const router = express.Router();

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit contact us form
 *     description: Allows users to submit contact inquiries through the contact us form. All fields are required and will be sent to info@zushh.com.
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phone
 *               - subject
 *               - message
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "John"
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Doe"
 *                 description: User's last name
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *                 description: User's email address
 *               phone:
 *                 type: string
 *                 example: "+971501234567"
 *                 description: User's phone number
 *               subject:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 100
 *                 example: "Inquiry about services"
 *                 description: Contact subject
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 example: "I would like to know more about your cleaning services..."
 *                 description: Contact message
 *     responses:
 *       200:
 *         description: Contact form submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 description:
 *                   type: string
 *                   example: "Your message has been sent successfully. We will get back to you soon!"
 *                 content:
 *                   type: object
 *                   properties:
 *                     messageId:
 *                       type: string
 *                       example: "<message-id@outlook.com>"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-12-01T10:30:00.000Z"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 exception:
 *                   type: string
 *                   example: "MISSING_REQUIRED_FIELDS"
 *                 description:
 *                   type: string
 *                   example: "All fields are required (firstName, lastName, email, phone, subject, message)"
 *       500:
 *         description: Server error - email sending failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 exception:
 *                   type: string
 *                   example: "EMAIL_SEND_FAILED"
 *                 description:
 *                   type: string
 *                   example: "Failed to send your message. Please try again later."
 */
const contactFormValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
    .custom((value) => {
      // Remove spaces, dashes, parentheses for validation
      const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
      return cleanPhone.length >= 7 && cleanPhone.length <= 15;
    })
    .withMessage('Phone number must be between 7 and 15 digits'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Subject must be between 5 and 100 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
];

router.post('/', contactFormValidation, submitContactForm);

module.exports = router;

const express = require("express");
const { body } = require("express-validator");
const {
  sendMarketingEmail,
  testEmail,
} = require("../controllers/emailController");
const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/roleAuth");

const router = express.Router();

/**
 * @swagger
 * /api/email/test:
 *   post:
 *     summary: Test email service configuration (Admin only)
 *     description: Tests the email service connection and optionally sends a test email to verify the configuration
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testEmail:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *                 description: Optional email address to send test email to
 *     responses:
 *       200:
 *         description: Email service test successful
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
 *                   example: "Email service test successful"
 *                 content:
 *                   type: object
 *                   properties:
 *                     connectionTest:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                           example: true
 *                         message:
 *                           type: string
 *                           example: "Email service is configured correctly"
 *                     testEmail:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                           example: true
 *                         messageId:
 *                           type: string
 *                           example: "<message-id>"
 *                         recipient:
 *                           type: string
 *                           example: "admin@example.com"
 *                         message:
 *                           type: string
 *                           example: "Test email sent successfully"
 *       400:
 *         description: Bad request - invalid email format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error - email configuration error
 */
const testEmailValidation = [
  body("testEmail")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
];

router.post("/test", protect, isAdmin, testEmailValidation, testEmail);

/**
 * @swagger
 * /api/email/marketing:
 *   post:
 *     summary: Send marketing email to customers (Admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipients
 *               - subject
 *               - message
 *             properties:
 *               recipients:
 *                 oneOf:
 *                   - type: string
 *                     enum: [all]
 *                     description: Send to all active users
 *                   - type: string
 *                     format: email
 *                     description: Single email address
 *                   - type: array
 *                     items:
 *                       type: string
 *                       format: email
 *                     description: Array of email addresses
 *                 example: "all"
 *               subject:
 *                 type: string
 *                 example: "Special Offer - 20% Off All Services"
 *                 description: Email subject line
 *               message:
 *                 type: string
 *                 example: "We're excited to announce a special promotion..."
 *                 description: Email message content
 *               title:
 *                 type: string
 *                 example: "Special Announcement"
 *                 description: Optional title for the email (defaults to 'Important Update from ZUSH')
 *     responses:
 *       200:
 *         description: Marketing email sent successfully
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
 *                   example: "Marketing email sent successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     totalRecipients:
 *                       type: integer
 *                       example: 150
 *                     totalSent:
 *                       type: integer
 *                       example: 150
 *                     totalFailed:
 *                       type: integer
 *                       example: 0
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           recipient:
 *                             type: string
 *                           success:
 *                             type: boolean
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
const sendMarketingEmailValidation = [
  body("recipients").notEmpty().withMessage("Recipients are required"),
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ max: 200 })
    .withMessage("Subject must not exceed 200 characters"),
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 10 })
    .withMessage("Message must be at least 10 characters"),
  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title must not exceed 100 characters"),
];

router.post(
  "/marketing",
  protect,
  isAdmin,
  sendMarketingEmailValidation,
  sendMarketingEmail,
);

module.exports = router;

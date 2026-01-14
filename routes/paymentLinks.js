const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleAuth');
const {
  generatePaymentLink,
  getPaymentLinkDetails,
  initiatePaymentViaLink,
  invalidatePaymentLink
} = require('../controllers/paymentLinkController');

const router = express.Router();

/**
 * @swagger
 * /api/admin/payments/generate-link:
 *   post:
 *     summary: Generate payment link for a service request (Admin only)
 *     tags: [Admin, Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceRequestId
 *             properties:
 *               serviceRequestId:
 *                 type: string
 *                 description: Service request ID
 *                 example: "64a1b2c3d4e5f6789abcdef1"
 *               expiryHours:
 *                 type: number
 *                 description: Link expiry in hours (default 48)
 *                 example: 48
 *     responses:
 *       200:
 *         description: Payment link generated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Service request not found
 */
router.post(
  '/admin/payments/generate-link',
  protect,
  isAdmin,
  [
    body('serviceRequestId')
      .notEmpty()
      .withMessage('Service request ID is required')
      .isMongoId()
      .withMessage('Invalid service request ID'),
    body('expiryHours')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('Expiry hours must be between 1 and 168 (7 days)')
  ],
  generatePaymentLink
);

/**
 * @swagger
 * /api/admin/payments/invalidate-link:
 *   post:
 *     summary: Invalidate/expire a payment link (Admin only)
 *     tags: [Admin, Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceRequestId
 *             properties:
 *               serviceRequestId:
 *                 type: string
 *                 description: Service request ID
 *     responses:
 *       200:
 *         description: Payment link invalidated successfully
 */
router.post(
  '/admin/payments/invalidate-link',
  protect,
  isAdmin,
  [
    body('serviceRequestId')
      .notEmpty()
      .withMessage('Service request ID is required')
      .isMongoId()
      .withMessage('Invalid service request ID')
  ],
  invalidatePaymentLink
);

/**
 * @swagger
 * /api/payments/link/{token}:
 *   get:
 *     summary: Get payment link details and validate token (Public)
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment link token
 *     responses:
 *       200:
 *         description: Payment link is valid
 *       400:
 *         description: Link expired or already used
 *       404:
 *         description: Invalid payment link
 */
router.get(
  '/payments/link/:token',
  [
    param('token')
      .notEmpty()
      .withMessage('Token is required')
      .isLength({ min: 32 })
      .withMessage('Invalid token format')
  ],
  getPaymentLinkDetails
);

/**
 * @swagger
 * /api/payments/link/{token}/initiate:
 *   post:
 *     summary: Initiate payment via payment link (Public)
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment link token
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *       400:
 *         description: Invalid or expired link
 *       404:
 *         description: Invalid payment link
 */
router.post(
  '/payments/link/:token/initiate',
  [
    param('token')
      .notEmpty()
      .withMessage('Token is required')
      .isLength({ min: 32 })
      .withMessage('Invalid token format')
  ],
  initiatePaymentViaLink
);

module.exports = router;

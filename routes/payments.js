const express = require('express');
const { body } = require('express-validator');
const {
  initiatePayment,
  handlePaymentCallback,
  handlePaymentCancel,
  getPaymentStatus
} = require('../controllers/paymentController');

const router = express.Router();

// Validation rules
const initiatePaymentValidation = [
  body('serviceRequestId')
    .isMongoId()
    .withMessage('Service request ID must be a valid MongoDB ObjectId')
];

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate CCAvenue payment for a service request
 *     tags: [Payments]
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
 *                 example: "64a1b2c3d4e5f6789abcdef1"
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 description:
 *                   type: string
 *                 content:
 *                   type: object
 *                   properties:
 *                     paymentUrl:
 *                       type: string
 *                     paymentFormData:
 *                       type: object
 *                       properties:
 *                         encRequest:
 *                           type: string
 *                         access_code:
 *                           type: string
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *       400:
 *         description: Bad request
 *       404:
 *         description: Service request not found
 */
router.post('/initiate', initiatePaymentValidation, initiatePayment);

/**
 * @swagger
 * /api/payments/callback:
 *   post:
 *     summary: Handle CCAvenue payment callback
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               encResponse:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment callback processed
 *       400:
 *         description: Bad request
 *   get:
 *     summary: Handle CCAvenue payment callback (GET method)
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: encResponse
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment callback processed
 *       400:
 *         description: Bad request
 */
router.post('/callback', handlePaymentCallback);
router.get('/callback', handlePaymentCallback);

/**
 * @swagger
 * /api/payments/cancel:
 *   get:
 *     summary: Handle payment cancellation
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment cancelled
 */
router.get('/cancel', handlePaymentCancel);

/**
 * @swagger
 * /api/payments/status/{serviceRequestId}:
 *   get:
 *     summary: Get payment status for a service request
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: serviceRequestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequestId:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                       enum: [Pending, Success, Failure, Cancelled]
 *                     paymentDetails:
 *                       type: object
 *                     totalPrice:
 *                       type: number
 */
router.get('/status/:serviceRequestId', getPaymentStatus);

module.exports = router;


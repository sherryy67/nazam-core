const express = require('express');
const { body } = require('express-validator');
const { submitServiceRequest } = require('../controllers/serviceRequestController');

const router = express.Router();

// Validation rules for service request submission
const submitServiceRequestValidation = [
  body('user_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('User name must be between 2 and 100 characters'),
  body('user_phone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('User phone must be between 10 and 15 characters'),
  body('user_email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  body('service_id')
    .isMongoId()
    .withMessage('Service ID must be a valid MongoDB ObjectId'),
  body('service_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),
  body('category_id')
    .isMongoId()
    .withMessage('Category ID must be a valid MongoDB ObjectId'),
  body('category_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('request_type')
    .isIn(['Quotation', 'OnTime', 'Scheduled'])
    .withMessage('Request type must be Quotation, OnTime, or Scheduled'),
  body('requested_date')
    .isISO8601()
    .withMessage('Requested date must be a valid ISO 8601 date'),
  body('number_of_units')
    .isInt({ min: 1 })
    .withMessage('Number of units must be a positive integer'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message must be less than 1000 characters'),
  body('selectedSubServices')
    .optional()
    .custom((value, { req }) => {
      // selectedSubServices should be a valid JSON array if provided
      if (value !== undefined && value !== null) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          if (!Array.isArray(parsed)) {
            throw new Error('selectedSubServices must be an array');
          }
          // Validate each selected sub-service
          for (const sub of parsed) {
            if (!sub.name || typeof sub.name !== 'string') {
              throw new Error('Each selected sub-service must have a name');
            }
            if (sub.quantity !== undefined && (isNaN(sub.quantity) || sub.quantity < 1)) {
              throw new Error('Each selected sub-service quantity must be at least 1');
            }
          }
        } catch (error) {
          throw new Error(error.message || 'Invalid selectedSubServices format');
        }
      }
      return true;
    }),
  // Milestone payment fields
  body('payment_type')
    .optional()
    .isIn(['full', 'milestone'])
    .withMessage('Payment type must be full or milestone'),
  body('milestones')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined && value !== null) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          if (!Array.isArray(parsed)) {
            throw new Error('milestones must be an array');
          }
          if (parsed.length < 2) {
            throw new Error('At least 2 milestones are required');
          }
          let totalPercentage = 0;
          for (const milestone of parsed) {
            if (!milestone.name || typeof milestone.name !== 'string') {
              throw new Error('Each milestone must have a name');
            }
            if (milestone.percentage !== undefined) {
              const percentage = Number(milestone.percentage);
              if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
                throw new Error('Each milestone percentage must be between 1 and 100');
              }
              totalPercentage += percentage;
            }
          }
          if (Math.abs(totalPercentage - 100) > 0.01) {
            throw new Error('Total milestone percentage must equal 100%');
          }
        } catch (error) {
          throw new Error(error.message || 'Invalid milestones format');
        }
      }
      return true;
    }),
  body('require_sequential_payment')
    .optional()
    .isBoolean()
    .withMessage('require_sequential_payment must be a boolean')
];

/**
 * @swagger
 * /api/submit-service-requests:
 *   post:
 *     summary: Submit a service request
 *     tags: [Service Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_name
 *               - user_phone
 *               - user_email
 *               - address
 *               - service_id
 *               - service_name
 *               - category_id
 *               - category_name
 *               - request_type
 *               - requested_date
 *             properties:
 *               user_name:
 *                 type: string
 *                 example: "John Doe"
 *               user_phone:
 *                 type: string
 *                 example: "+971501234567"
 *               user_email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               address:
 *                 type: string
 *                 example: "123 Main Street, Dubai, UAE"
 *               service_id:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789abcdef1"
 *               service_name:
 *                 type: string
 *                 example: "Emergency Plumbing"
 *               category_id:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789abcdef2"
 *               category_name:
 *                 type: string
 *                 example: "Plumbing"
 *               request_type:
 *                 type: string
 *                 enum: [Quotation, OnTime, Scheduled]
 *                 example: "OnTime"
 *               requested_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:00:00.000Z"
 *               number_of_units:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               selectedSubServices:
 *                 type: string
 *                 example: '[{"name":"AC Soft Cleaning","quantity":1},{"name":"AC Deep Cleaning","quantity":2}]'
 *                 description: JSON array of selected sub-services (optional - for services with subServices)
 *               message:
 *                 type: string
 *                 example: "Need urgent plumbing service for blocked drain"
 *     responses:
 *       201:
 *         description: Service request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 exception:
 *                   type: string
 *                   example: null
 *                 description:
 *                   type: string
 *                   example: "Service request submitted successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequest:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         user_name:
 *                           type: string
 *                         user_phone:
 *                           type: string
 *                         user_email:
 *                           type: string
 *                         address:
 *                           type: string
 *                         service_id:
 *                           type: string
 *                         service_name:
 *                           type: string
 *                         category_id:
 *                           type: string
 *                         category_name:
 *                           type: string
 *                         request_type:
 *                           type: string
 *                         requested_date:
 *                           type: string
 *                         message:
 *                           type: string
 *                         status:
 *                           type: string
 *                         unit_type:
 *                           type: string
 *                           enum: [per_unit, per_hour]
 *                         unit_price:
 *                           type: number
 *                         number_of_units:
 *                           type: integer
 *                         total_price:
 *                           type: number
 *                         createdAt:
 *                           type: string
 *                         updatedAt:
 *                           type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/', submitServiceRequestValidation, submitServiceRequest);

module.exports = router;

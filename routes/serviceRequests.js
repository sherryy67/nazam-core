const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { authorize, isAdmin } = require('../middlewares/roleAuth');
const { 
  submitServiceRequest, 
  getServiceRequests, 
  updateServiceRequestStatus,
  deleteServiceRequest
} = require('../controllers/serviceRequestController');

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
    .withMessage('Phone number must be between 10 and 15 characters'),
  body('user_email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
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
    .withMessage('Requested date must be a valid ISO 8601 date')
    .custom((value) => {
      const requestedDate = new Date(value);
      const now = new Date();
      if (requestedDate < now) {
        throw new Error('Requested date cannot be in the past');
      }
      return true;
    }),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message must be less than 1000 characters')
];

// Validation rules for status update
const updateStatusValidation = [
  body('status')
    .isIn(['Pending', 'Assigned', 'Accepted', 'Completed', 'Cancelled'])
    .withMessage('Status must be Pending, Assigned, Accepted, Completed, or Cancelled'),
  body('vendor')
    .optional()
    .isMongoId()
    .withMessage('Vendor ID must be a valid MongoDB ObjectId')
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
 *                 example: "+1234567890"
 *               user_email:
 *                 type: string
 *                 example: "john@example.com"
 *               address:
 *                 type: string
 *                 example: "123 Main St, City, State 12345"
 *               service_id:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789abcdef1"
 *               service_name:
 *                 type: string
 *                 example: "AC Cleaning Service"
 *               category_id:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789abcdef0"
 *               category_name:
 *                 type: string
 *                 example: "Home Cleaning"
 *               request_type:
 *                 type: string
 *                 enum: [Quotation, OnTime, Scheduled]
 *                 example: "OnTime"
 *               requested_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-12-15T10:00:00.000Z"
 *               message:
 *                 type: string
 *                 example: "Please clean the AC unit in the living room"
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
 *                 exception:
 *                   type: string
 *                 description:
 *                   type: string
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
 *                         createdAt:
 *                           type: string
 *                         updatedAt:
 *                           type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/submit-service-requests', submitServiceRequestValidation, submitServiceRequest);

/**
 * @swagger
 * /api/service-requests:
 *   get:
 *     summary: Get all service requests (Admin only)
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Pending, Assigned, Accepted, Completed, Cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: request_type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Quotation, OnTime, Scheduled]
 *         description: Filter by request type
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Service requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exception:
 *                   type: string
 *                 description:
 *                   type: string
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           user_name:
 *                             type: string
 *                           user_phone:
 *                             type: string
 *                           user_email:
 *                             type: string
 *                           address:
 *                             type: string
 *                           service_id:
 *                             type: string
 *                           service_name:
 *                             type: string
 *                           category_id:
 *                             type: string
 *                           category_name:
 *                             type: string
 *                           request_type:
 *                             type: string
 *                           requested_date:
 *                             type: string
 *                           message:
 *                             type: string
 *                           status:
 *                             type: string
 *                           vendor:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                           updatedAt:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalCount:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/', protect, isAdmin, getServiceRequests);

/**
 * @swagger
 * /api/service-requests/{id}/status:
 *   put:
 *     summary: Update service request status (Admin only)
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, Assigned, Accepted, Completed, Cancelled]
 *                 example: "Assigned"
 *               vendor:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789abcdef2"
 *     responses:
 *       200:
 *         description: Service request status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exception:
 *                   type: string
 *                 description:
 *                   type: string
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequest:
 *                       type: object
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Service request not found
 */
router.put('/:id/status', protect, isAdmin, updateStatusValidation, updateServiceRequestStatus);

/**
 * @swagger
 * /api/service-requests/{id}:
 *   delete:
 *     summary: Delete a service request (Admin only)
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service request ID
 *     responses:
 *       200:
 *         description: Service request deleted successfully
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
 *                   example: "Service request deleted successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     deletedRequest:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         user_name:
 *                           type: string
 *                         service_name:
 *                           type: string
 *                         status:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Service request not found
 */
router.delete('/:id', protect, isAdmin, deleteServiceRequest);

module.exports = router;

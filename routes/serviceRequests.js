const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { authorize, isAdmin } = require('../middlewares/roleAuth');
const {
  submitServiceRequest,
  adminSubmitServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus,
  deleteServiceRequest,
  bulkDeleteServiceRequests,
  getOrderDetails,
  userUpdateServiceRequest,
  userCancelServiceRequest,
  userDeleteServiceRequest,
  updateQuotationPrice
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
 * /api/service-requests/admin-submit:
 *   post:
 *     summary: Admin submit service request on behalf of user
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
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
 *               - number_of_units
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
 *               number_of_units:
 *                 type: integer
 *                 example: 1
 *               message:
 *                 type: string
 *                 example: "Customer called to book this service"
 *               payment_method:
 *                 type: string
 *                 enum: [Cash On Delivery, Online Payment]
 *                 example: "Cash On Delivery"
 *               selectedSubServices:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Service request submitted by admin successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/admin-submit', protect, isAdmin, adminSubmitServiceRequest);

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
 * /api/service-requests/{id}/quote:
 *   put:
 *     summary: Update quotation price for Quotation type requests (Admin only)
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service request ID (must be Quotation type)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - total_price
 *             properties:
 *               total_price:
 *                 type: number
 *                 example: 5000
 *                 description: Quoted price for the service
 *               unit_price:
 *                 type: number
 *                 example: 5000
 *                 description: Unit price (optional, defaults to total_price)
 *               status:
 *                 type: string
 *                 enum: [Pending, Quoted, Assigned, Accepted, InProgress, Completed, Cancelled]
 *                 example: "Quoted"
 *                 description: Status to update (optional, defaults to "Quoted")
 *               admin_notes:
 *                 type: string
 *                 example: "Price includes materials and 2 days labor"
 *                 description: Admin notes about the quotation (optional)
 *     responses:
 *       200:
 *         description: Quotation price updated successfully
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
 *         description: Bad request - Not a Quotation type or invalid price
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Service request not found
 */
router.put('/:id/quote', protect, isAdmin, updateQuotationPrice);

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
/**
 * @swagger
 * /api/service-requests/bulk-delete:
 *   delete:
 *     summary: Bulk delete service requests (Admin only)
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["64a1b2c3d4e5f6789abcdef1", "64a1b2c3d4e5f6789abcdef2"]
 *                 description: Array of service request IDs to delete
 *     responses:
 *       200:
 *         description: Service requests deleted successfully
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
 *                   example: "3 service request(s) deleted successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: integer
 *                       example: 3
 *                     requestedCount:
 *                       type: integer
 *                       example: 3
 *                     deletedRequests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           user_name:
 *                             type: string
 *                           service_name:
 *                             type: string
 *                           status:
 *                             type: string
 *       400:
 *         description: Bad request - Invalid or missing IDs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: No service requests found with provided IDs
 */
router.delete('/bulk-delete', protect, isAdmin, bulkDeleteServiceRequests);

router.delete('/:id', protect, isAdmin, deleteServiceRequest);

/**
 * @swagger
 * /api/service-requests/{id}/details:
 *   get:
 *     summary: Get order details by request ID
 *     tags: [Service Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service request ID
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
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
 *                   example: "Order details retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     orderDetails:
 *                       type: object
 *                       properties:
 *                         orderId:
 *                           type: string
 *                           example: "690501334f243577095f9787"
 *                         userName:
 *                           type: string
 *                           example: "John Doe"
 *                         userPhoneNumber:
 *                           type: string
 *                           example: "+971501234567"
 *                         userEmail:
 *                           type: string
 *                           example: "john@example.com"
 *                         serviceCity:
 *                           type: string
 *                           example: "Dubai"
 *                         address:
 *                           type: string
 *                           example: "123 Main Street, Dubai, UAE"
 *                         category:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                         service:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                         createdDate:
 *                           type: string
 *                           format: date-time
 *                         requestedDateTime:
 *                           type: string
 *                           format: date-time
 *                         paymentMethod:
 *                           type: string
 *                           enum: [Cash On Delivery, Online Payment]
 *                           example: "Cash On Delivery"
 *       400:
 *         description: Bad request - Invalid request ID
 *       404:
 *         description: Order not found
 */
router.get('/:id/details', getOrderDetails);

// Validation rules for user update service request
const requestUpdateValidation = [
  body('user_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('User name must be between 2 and 100 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  body('requested_date')
    .optional()
    .isISO8601()
    .withMessage('Requested date must be a valid ISO 8601 date'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message must be less than 1000 characters'),
  body('number_of_units')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Number of units must be a positive integer'),
  body('payment_method')
    .optional()
    .isIn(['Cash On Delivery', 'Online Payment', 'cash on delivery', 'online payment'])
    .withMessage('Payment method must be Cash On Delivery or Online Payment')
];

/**
 * @swagger
 * /api/service-requests/{id}/request-update:
 *   put:
 *     summary: Update service request by user (only when status is Pending)
 *     description: Allows authenticated users to edit their service request only when the status is "Pending". Once the status changes to Assigned, Accepted, Completed, or Cancelled, editing is no longer allowed. Ownership is verified via JWT token.
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
 *             properties:
 *               user_name:
 *                 type: string
 *                 example: "John Doe Updated"
 *                 description: Updated user name
 *               address:
 *                 type: string
 *                 example: "456 New Street, Dubai, UAE"
 *                 description: Updated address
 *               requested_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-25T14:00:00.000Z"
 *                 description: Updated requested date
 *               message:
 *                 type: string
 *                 example: "Updated message for the service"
 *                 description: Updated message/notes
 *               number_of_units:
 *                 type: integer
 *                 example: 3
 *                 description: Updated number of units (recalculates pricing)
 *               payment_method:
 *                 type: string
 *                 enum: [Cash On Delivery, Online Payment]
 *                 example: "Online Payment"
 *                 description: Updated payment method
 *               selectedSubServices:
 *                 type: array
 *                 description: Updated sub-services selection
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Service request updated successfully
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
 *                   example: "Service request updated successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequest:
 *                       type: object
 *       400:
 *         description: Bad request - Invalid data, status not Pending, or no fields to update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 description:
 *                   type: string
 *                   example: "Cannot edit service request. Current status is \"Assigned\". Only requests with \"Pending\" status can be edited."
 *                 exception:
 *                   type: string
 *                   example: "REQUEST_NOT_EDITABLE"
 *       401:
 *         description: Unauthorized - No token or invalid token
 *       403:
 *         description: Forbidden - User not authorized (service request doesn't belong to user)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 description:
 *                   type: string
 *                   example: "You are not authorized to update this service request"
 *                 exception:
 *                   type: string
 *                   example: "UNAUTHORIZED_ACCESS"
 *       404:
 *         description: Service request not found
 */
router.put('/:id/request-update', protect, requestUpdateValidation, userUpdateServiceRequest);

/**
 * @swagger
 * /api/service-requests/{id}/cancel:
 *   put:
 *     summary: Cancel service request by user (only when status is Pending)
 *     description: Allows authenticated users to cancel their service request only when the status is "Pending". Once the status changes to Assigned, Accepted, Completed, or Cancelled, cancellation is no longer allowed. Ownership is verified via JWT token. This updates the status to "Cancelled" instead of deleting the record.
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
 *         description: Service request cancelled successfully
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
 *                   example: "Service request cancelled successfully"
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
 *                         user_email:
 *                           type: string
 *                         service_name:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "Cancelled"
 *       400:
 *         description: Bad request - Status not Pending
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 description:
 *                   type: string
 *                   example: "Cannot cancel service request. Current status is \"Assigned\". Only requests with \"Pending\" status can be cancelled."
 *                 exception:
 *                   type: string
 *                   example: "REQUEST_NOT_CANCELLABLE"
 *       401:
 *         description: Unauthorized - No token or invalid token
 *       403:
 *         description: Forbidden - User not authorized (service request doesn't belong to user)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 description:
 *                   type: string
 *                   example: "You are not authorized to cancel this service request"
 *                 exception:
 *                   type: string
 *                   example: "UNAUTHORIZED_ACCESS"
 *       404:
 *         description: Service request not found
 */
router.put('/:id/cancel', protect, userCancelServiceRequest);

/**
 * @swagger
 * /api/service-requests/{id}/request-delete:
 *   delete:
 *     summary: Delete service request by user (only when status is Pending)
 *     description: Allows authenticated users to delete their service request only when the status is "Pending". Once the status changes to Assigned, Accepted, Completed, or Cancelled, deletion is no longer allowed. Ownership is verified via JWT token.
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
 *                         user_email:
 *                           type: string
 *                         service_name:
 *                           type: string
 *                         status:
 *                           type: string
 *       400:
 *         description: Bad request - Status not Pending
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 description:
 *                   type: string
 *                   example: "Cannot delete service request. Current status is \"Assigned\". Only requests with \"Pending\" status can be deleted."
 *                 exception:
 *                   type: string
 *                   example: "REQUEST_NOT_DELETABLE"
 *       401:
 *         description: Unauthorized - No token or invalid token
 *       403:
 *         description: Forbidden - User not authorized (service request doesn't belong to user)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 description:
 *                   type: string
 *                   example: "You are not authorized to delete this service request"
 *                 exception:
 *                   type: string
 *                   example: "UNAUTHORIZED_ACCESS"
 *       404:
 *         description: Service request not found
 */
router.delete('/:id/request-delete', protect, userDeleteServiceRequest);

module.exports = router;

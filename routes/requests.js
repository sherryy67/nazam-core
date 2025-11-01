const express = require('express');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleAuth');
const ROLES = require('../constants/roles');
const { submitServiceRequest, getServiceRequests, updateServiceRequestStatus, assignRequest } = require('../controllers/serviceRequestController');

const router = express.Router();

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Create a new service request
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
 *               - service
 *               - address
 *               - scheduledDate
 *             properties:
 *               service:
 *                 type: string
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *               quantity:
 *                 type: number
 *                 example: 3
 *               hours:
 *                 type: number
 *                 example: 2
 *               address:
 *                 type: string
 *                 example: "123 Main St, City, Country"
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-12-15T10:00:00.000Z"
 *               notes:
 *                 type: string
 *                 example: "Please call before arriving"
 *     responses:
 *       201:
 *         description: Service request created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User access required
 */
router.post('/', protect, authorize(ROLES.USER), submitServiceRequest);

/**
 * @swagger
 * /api/requests:
 *   get:
 *     summary: Get all service requests
 *     tags: [Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Assigned, InProgress, Completed, Cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of requests per page
 *     responses:
 *       200:
 *         description: Service requests retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/', protect, authorize(ROLES.ADMIN), getServiceRequests);

/**
 * @swagger
 * /api/requests/assign:
 *   patch:
 *     summary: Assign a service request to a vendor
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
 *               - requestId
 *               - vendorId
 *             properties:
 *               requestId:
 *                 type: string
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *               vendorId:
 *                 type: string
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b4"
 *     responses:
 *       200:
 *         description: Service request assigned successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Request or vendor not found
 */
router.patch('/assign', protect, authorize(ROLES.ADMIN), assignRequest);

/**
 * @swagger
 * /api/requests/{id}/status:
 *   patch:
 *     summary: Update service request status
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
 *                 enum: [Pending, Assigned, InProgress, Completed, Cancelled]
 *                 example: "InProgress"
 *     responses:
 *       200:
 *         description: Service request status updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required or not assigned to request
 *       404:
 *         description: Service request not found
 */
router.patch('/:id/status', protect, authorize(ROLES.VENDOR), updateServiceRequestStatus);

module.exports = router;

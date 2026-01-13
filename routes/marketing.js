const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleAuth');
const {
  setMarketingServices,
  getMarketingServices,
  getAllServicesForMarketing,
} = require('../controllers/marketingController');

const router = express.Router();

// Validation helper for ID collections
const idCollectionValidator = (value, { req }) => {
  if (value === undefined || value === null) {
    return true;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new Error('Array must contain at least one service ID');
    }
    const invalid = value.some(id => typeof id !== 'string' || id.trim().length === 0);
    if (invalid) {
      throw new Error('Each service ID must be a non-empty string');
    }
  } else if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Value must be a non-empty string or an array of strings');
  }

  return true;
};

// Validation rules for marking services
const setMarketingServicesValidation = [
  body('serviceIds').custom(idCollectionValidator),
  body('markIds').custom(idCollectionValidator),
  body('unmarkIds').custom(idCollectionValidator),
  body('isMarketing')
    .optional()
    .isBoolean()
    .withMessage('isMarketing must be a boolean value')
];

/**
 * @swagger
 * tags:
 *   name: Marketing
 *   description: Marketing service management endpoints
 */

/**
 * @swagger
 * /api/marketing/services:
 *   post:
 *     summary: Mark or unmark services for marketing (Admin only)
 *     description: Admin can mark or unmark services to be displayed in marketing campaigns
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceIds:
 *                 description: Optional field used with isMarketing to toggle a single group of IDs
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 example: ["64a1b2c3d4e5f6789abcdef0", "64a1b2c3d4e5f6789abcdef1"]
 *               isMarketing:
 *                 type: boolean
 *                 description: Defaults to true. Set false to remove marketing flag.
 *                 example: true
 *               markIds:
 *                 type: array
 *                 description: IDs that should be marked for marketing within the same request
 *                 items:
 *                   type: string
 *                 example: ["64a1b2c3d4e5f6789abcdef0"]
 *               unmarkIds:
 *                 type: array
 *                 description: IDs that should be removed from marketing within the same request
 *                 items:
 *                   type: string
 *                 example: ["64a1b2c3d4e5f6789abcdef1"]
 *     responses:
 *       200:
 *         description: Services marketing status updated successfully
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
 *                   example: "Service marketing status updated successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     matchedCount:
 *                       type: integer
 *                       example: 2
 *                     modifiedCount:
 *                       type: integer
 *                       example: 2
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                     marketingServices:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalMarketing:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/services', protect, isAdmin, setMarketingServicesValidation, setMarketingServices);

/**
 * @swagger
 * /api/marketing/services:
 *   get:
 *     summary: Get all services marked for marketing (Public)
 *     description: Returns all active services that are marked for marketing campaigns
 *     tags: [Marketing]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Optional maximum number of services to return
 *         example: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Optional category ID to filter services
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *           enum: [residential, commercial]
 *         description: Optional service type filter
 *         example: "residential"
 *     responses:
 *       200:
 *         description: Marketing services retrieved successfully
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
 *                   example: "Marketing services retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           basePrice:
 *                             type: number
 *                           category_id:
 *                             type: object
 *                           isMarketingService:
 *                             type: boolean
 *                             example: true
 *                     total:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Bad request - invalid parameters
 *       500:
 *         description: Server error
 */
router.get('/services', getMarketingServices);

/**
 * @swagger
 * /api/marketing/services/all:
 *   get:
 *     summary: Get all services with marketing status for admin management (Admin only)
 *     description: Returns all active services with their marketing status for admin to mark/unmark services
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of services per page
 *         example: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Optional category ID to filter services
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *           enum: [residential, commercial]
 *         description: Optional service type filter
 *         example: "residential"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search services by name
 *         example: "cleaning"
 *     responses:
 *       200:
 *         description: Services retrieved successfully
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
 *                   example: "Services retrieved successfully for marketing management"
 *                 content:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category_id:
 *                             type: object
 *                           isMarketingService:
 *                             type: boolean
 *                           isFeatured:
 *                             type: boolean
 *                           serviceType:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalServices:
 *                           type: integer
 *                         servicesPerPage:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         totalServices:
 *                           type: integer
 *                         marketingServices:
 *                           type: integer
 *                         nonMarketingServices:
 *                           type: integer
 *       400:
 *         description: Bad request - invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/services/all', protect, isAdmin, getAllServicesForMarketing);

module.exports = router;

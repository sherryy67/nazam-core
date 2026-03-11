const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { isAdmin, hasPermission } = require('../middlewares/roleAuth');
const {
  setMarketingServices,
  getMarketingServices,
  getAllServicesForMarketing,
  getServiceMarketingContent,
  updateServiceMarketingContent,
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
router.post('/services', protect, hasPermission('marketing:write'), setMarketingServicesValidation, setMarketingServices);

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
router.get('/services/all', protect, hasPermission('marketing:read'), getAllServicesForMarketing);

/**
 * @swagger
 * /api/marketing/services/{id}/content:
 *   get:
 *     summary: Get marketing content for a specific service
 *     description: Returns only marketing-related content fields for a service (content sections, benefits, FAQs, testimonials, SEO fields)
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *     responses:
 *       200:
 *         description: Service marketing content retrieved successfully
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
 *                   example: "Service marketing content retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         contentSections:
 *                           type: array
 *                           items:
 *                             type: object
 *                         benefitsTitle:
 *                           type: string
 *                         benefits:
 *                           type: array
 *                           items:
 *                             type: object
 *                         whyChooseUs:
 *                           type: object
 *                         whereWeOffer:
 *                           type: object
 *                         youtubeLink:
 *                           type: string
 *                         faqs:
 *                           type: array
 *                           items:
 *                             type: object
 *                         testimonials:
 *                           type: array
 *                           items:
 *                             type: object
 *                         metaTitle:
 *                           type: string
 *                         metaDescription:
 *                           type: string
 *                         urlSlug:
 *                           type: string
 *                         ogTitle:
 *                           type: string
 *                         ogDescription:
 *                           type: string
 *       400:
 *         description: Bad request - invalid service ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - marketing:read permission required
 *       404:
 *         description: Service not found
 */
router.get('/services/:id/content', protect, hasPermission('marketing:read'), getServiceMarketingContent);

/**
 * @swagger
 * /api/marketing/services/{id}/content:
 *   put:
 *     summary: Update marketing content for a specific service
 *     description: Allows marketing team to update only marketing-related content fields (content sections, benefits, FAQs, testimonials, SEO fields) without full service access
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contentSections:
 *                 type: array
 *                 description: Up to 2 content sections with heading, description, and includedServices
 *                 items:
 *                   type: object
 *                   properties:
 *                     heading:
 *                       type: string
 *                     description:
 *                       type: string
 *                     includedServices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           icon:
 *                             type: string
 *                           heading:
 *                             type: string
 *                           description:
 *                             type: string
 *               benefitsTitle:
 *                 type: string
 *               benefits:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     icon:
 *                       type: string
 *                     heading:
 *                       type: string
 *                     description:
 *                       type: string
 *               whyChooseUs:
 *                 type: object
 *                 properties:
 *                   heading:
 *                     type: string
 *                   description:
 *                     type: string
 *               whereWeOffer:
 *                 type: object
 *                 properties:
 *                   heading:
 *                     type: string
 *                   description:
 *                     type: string
 *               youtubeLink:
 *                 type: string
 *               faqs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question:
 *                       type: string
 *                     answer:
 *                       type: string
 *               testimonials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     designation:
 *                       type: string
 *                     rating:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 5
 *                     description:
 *                       type: string
 *               metaTitle:
 *                 type: string
 *               metaDescription:
 *                 type: string
 *               urlSlug:
 *                 type: string
 *               ogTitle:
 *                 type: string
 *               ogDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Service marketing content updated successfully
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
 *                   example: "Service marketing content updated successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: object
 *       400:
 *         description: Bad request - invalid input, parse error, duplicate slug, or no fields provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - marketing:write permission required
 *       404:
 *         description: Service not found
 */
router.put('/services/:id/content', protect, hasPermission('marketing:write'), updateServiceMarketingContent);

module.exports = router;

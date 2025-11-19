const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleAuth');
const uploadBanner = require('../middlewares/uploadBanner');
const {
  createBanner,
  getBanners,
  updateSortOrder,
  deleteBanner
} = require('../controllers/bannerController');

const router = express.Router();

// Validation rules for banner creation/update
const createBannerValidation = [
  body('_id')
    .optional()
    .isMongoId()
    .withMessage('_id must be a valid MongoDB ID (for updates)'),
  body('service')
    .notEmpty()
    .withMessage('Service is required')
    .isMongoId()
    .withMessage('Service must be a valid MongoDB ID'),
  body('discountPercentage')
    .notEmpty()
    .withMessage('Discount percentage is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100'),
  body('mediaType')
    .notEmpty()
    .withMessage('Media type is required')
    .isIn(['image', 'video'])
    .withMessage('Media type must be either "image" or "video"'),
  body('platform')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return ['mobile', 'web', 'both'].includes(value);
      }
      if (Array.isArray(value)) {
        return value.every(p => ['mobile', 'web', 'both'].includes(p));
      }
      return false;
    })
    .withMessage('Platform must be "mobile", "web", "both", or an array of these values'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation rules for sort order update
const updateSortOrderValidation = [
  body('bannerId')
    .notEmpty()
    .withMessage('Banner ID is required')
    .isMongoId()
    .withMessage('Banner ID must be a valid MongoDB ID'),
  body('sortOrder')
    .notEmpty()
    .withMessage('Sort order is required')
    .isInt()
    .withMessage('Sort order must be an integer')
];

/**
 * @swagger
 * /api/banner:
 *   post:
 *     summary: Create or update a banner
 *     description: Create a new banner if _id is not provided, or update existing banner if _id is provided. Sort order is automatically assigned for new banners.
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - service
 *               - discountPercentage
 *               - mediaType
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Banner ID for updates (optional, omit for creation)
 *               service:
 *                 type: string
 *                 description: Service ID (MongoDB ObjectId)
 *               discountPercentage:
 *                 type: number
 *                 description: Discount percentage (0-100)
 *               mediaType:
 *                 type: string
 *                 enum: [image, video]
 *                 description: Type of media
 *               platform:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [mobile, web, both]
 *                 description: Platform(s) where banner should be displayed
 *                 default: [both]
 *               isActive:
 *                 type: boolean
 *                 description: Whether banner is active
 *                 default: true
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file to upload (required for creation, optional for updates)
 *     responses:
 *       201:
 *         description: Banner created successfully
 *       200:
 *         description: Banner updated successfully
 *       400:
 *         description: Validation error or missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Banner not found (for updates)
 *       500:
 *         description: Server error
 */
router.post(
  '/banner',
  protect,
  isAdmin,
  uploadBanner,
  createBannerValidation,
  createBanner
);

/**
 * @swagger
 * /api/banner:
 *   get:
 *     summary: Get all banners
 *     tags: [Banners]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [mobile, web, both]
 *         description: Filter by platform
 *     responses:
 *       200:
 *         description: Banners retrieved successfully
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
 *                     banners:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: number
 *       500:
 *         description: Server error
 */
router.get('/banner', getBanners);

/**
 * @swagger
 * /api/banner/sort-order:
 *   patch:
 *     summary: Update banner sort order
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bannerId
 *               - sortOrder
 *             properties:
 *               bannerId:
 *                 type: string
 *                 description: Banner ID (MongoDB ObjectId)
 *               sortOrder:
 *                 type: number
 *                 description: New sort order value
 *     responses:
 *       200:
 *         description: Sort order updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Banner not found
 *       500:
 *         description: Server error
 */
router.patch(
  '/banner/sort-order',
  protect,
  isAdmin,
  updateSortOrderValidation,
  updateSortOrder
);

/**
 * @swagger
 * /api/banner/{bannerId}:
 *   delete:
 *     summary: Delete a banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bannerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Banner ID (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Banner deleted successfully
 *       400:
 *         description: Invalid banner ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Banner not found
 *       500:
 *         description: Server error
 */
router.delete('/banner/:bannerId', protect, isAdmin, deleteBanner);

module.exports = router;


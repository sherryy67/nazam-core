const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { authorize, isAdmin } = require('../middlewares/roleAuth');
const ROLES = require('../constants/roles');
const { createService, getServices, getServicesPaginated, getServiceById, deleteService, getAllActiveServices, getServiceSubServices, setFeaturedServices, getFeaturedServices, getResidentialServices, getCommercialServices, getHomeCategoryServices, upload } = require('../controllers/serviceController');

const router = express.Router();

// Validation rules for service creation
const createServiceValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('basePrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Base price must be a positive number')
    .custom((value, { req }) => {
      // basePrice is required if job_service_type is NOT Quotation
      if (
        req.body.job_service_type &&
        req.body.job_service_type !== 'Quotation' &&
        req.body.unitType !== 'per_hour' &&
        (!value || value <= 0)
      ) {
        throw new Error('Base price is required for OnTime and Scheduled services when unit type is not per_hour');
      }
      return true;
    }),
  body('unitType')
    .optional()
    .isIn(['per_unit', 'per_hour'])
    .withMessage('Unit type must be either "per_unit" or "per_hour"')
    .custom((value, { req }) => {
      // unitType is required if job_service_type is NOT Quotation
      if (req.body.job_service_type && req.body.job_service_type !== 'Quotation' && (!value || value.trim().length === 0)) {
        throw new Error('Unit type is required for OnTime and Scheduled services');
      }
      return true;
    }),
  body('timeBasedPricing')
    .custom((value, { req }) => {
      const unitType = req.body.unitType;

      if (unitType === 'per_hour') {
        if (value === undefined || value === null || value === '') {
          throw new Error('timeBasedPricing is required for per_hour services');
        }
      }

      if (value === undefined || value === null || value === '') {
        return true;
      }

      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;

        if (!Array.isArray(parsed)) {
          throw new Error('timeBasedPricing must be an array');
        }

        if (unitType === 'per_hour' && parsed.length === 0) {
          throw new Error('timeBasedPricing must contain at least one tier for per_hour services');
        }

        for (const tier of parsed) {
          if (!tier || typeof tier !== 'object') {
            throw new Error('Each time-based pricing tier must be an object');
          }

          if (tier.hours === undefined || Number(tier.hours) < 1) {
            throw new Error('Each time-based pricing tier must include hours greater than or equal to 1');
          }

          if (tier.price === undefined || Number(tier.price) < 0) {
            throw new Error('Each time-based pricing tier must include a non-negative price');
          }
        }
      } catch (error) {
        throw new Error(error.message || 'Invalid timeBasedPricing format');
      }

      return true;
    }),
  body('category_id')
    .isMongoId()
    .withMessage('Category ID must be a valid MongoDB ObjectId'),
  body('min_time_required')
    .isInt({ min: 1, max: 1440 })
    .withMessage('Minimum time required must be between 1 and 1440 minutes'),
  body('availability')
    .isArray({ min: 1 })
    .withMessage('At least one availability day must be selected'),
  body('availability.*')
    .isIn(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    .withMessage('Invalid availability day'),
  body('job_service_type')
    .isIn(['OnTime', 'Scheduled', 'Quotation'])
    .withMessage('Job service type must be OnTime, Scheduled, or Quotation'),
  body('order_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Order name must be between 2 and 100 characters')
    .custom((value, { req }) => {
      // order_name is required if job_service_type is Quotation
      if (req.body.job_service_type === 'Quotation' && (!value || value.trim().length === 0)) {
        throw new Error('Order name is required for Quotation services');
      }
      return true;
    }),
  body('price_type')
    .optional()
    .isIn(['30min', '1hr', '1day', 'fixed'])
    .withMessage('Price type must be 30min, 1hr, 1day, or fixed')
    .custom((value, { req }) => {
      // price_type is required if job_service_type is NOT Quotation
      if (req.body.job_service_type && req.body.job_service_type !== 'Quotation' && (!value || value.trim().length === 0)) {
        throw new Error('Price type is required for OnTime and Scheduled services');
      }
      return true;
    }),
  body('subservice_type')
    .optional()
    .isIn(['single', 'multiple'])
    .withMessage('Subservice type must be single or multiple')
    .custom((value, { req }) => {
      // subservice_type is required if job_service_type is NOT Quotation
      if (req.body.job_service_type && req.body.job_service_type !== 'Quotation' && (!value || value.trim().length === 0)) {
        throw new Error('Subservice type is required for OnTime and Scheduled services');
      }
      return true;
    }),
  body('subServices')
    .optional()
    .custom((value, { req }) => {
      // subServices should be a valid JSON array if provided
      if (value !== undefined && value !== null) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          if (!Array.isArray(parsed)) {
            throw new Error('subServices must be an array');
          }
          // Validate each sub-service
          for (const sub of parsed) {
            if (!sub.name || typeof sub.name !== 'string') {
              throw new Error('Each sub-service must have a name');
            }
            if (sub.rate === undefined || sub.rate === null || isNaN(sub.rate) || sub.rate < 0) {
              throw new Error('Each sub-service must have a non-negative rate');
            }
          }
        } catch (error) {
          throw new Error(error.message || 'Invalid subServices format');
        }
      }
      return true;
    }),
  body('serviceType')
    .optional()
    .isIn(['residential', 'commercial'])
    .withMessage('Service type must be either "residential" or "commercial"'),
  body('badge')
    .optional()
    .trim()
    .isString()
    .withMessage('Badge must be a string')
];

// Validation rules for paginated services
const getServicesPaginatedValidation = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  body('category_id')
    .optional()
    .isMongoId()
    .withMessage('Category ID must be a valid MongoDB ObjectId'),
  body('sortBy')
    .optional()
    .isIn(['createdAt', 'name', 'basePrice', 'updatedAt'])
    .withMessage('SortBy must be createdAt, name, basePrice, or updatedAt'),
  body('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('SortOrder must be asc or desc')
];

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

const setFeaturedServicesValidation = [
  body('serviceIds').custom(idCollectionValidator),
  body('featureIds').custom(idCollectionValidator),
  body('unfeatureIds').custom(idCollectionValidator),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean value')
];

/**
 * @swagger
 * /api/services/featured:
 *   post:
 *     summary: Mark services as featured/unfeatured (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *             properties:
 *               serviceIds:
 *                 description: Optional legacy field used with isFeatured to toggle a single group of IDs
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 example: ["64a1b2c3d4e5f6789abcdef0", "64a1b2c3d4e5f6789abcdef1"]
 *               isFeatured:
 *                 type: boolean
 *                 description: Defaults to true. Set false to remove featured flag.
 *                 example: true
 *               featureIds:
 *                 type: array
 *                 description: IDs that should be marked as featured within the same request
 *                 items:
 *                   type: string
 *               unfeatureIds:
 *                 type: array
 *                 description: IDs that should be removed from featured within the same request
 *                 items:
 *                   type: string
 *     description: Provide at least one of serviceIds, featureIds, or unfeatureIds.
 *     responses:
 *       200:
 *         description: Services updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/featured', protect, isAdmin, setFeaturedServicesValidation, setFeaturedServices);

/**
 * @swagger
 * /api/services/featured:
 *   get:
 *     summary: Get featured services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Optional maximum number of services to return
 *     responses:
 *       200:
 *         description: Featured services retrieved successfully
 *       400:
 *         description: Bad request - invalid limit
 *       500:
 *         description: Server error
 */
router.get('/featured', getFeaturedServices);

/**
 * @swagger
 * /api/services/residential:
 *   get:
 *     summary: Get residential services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Optional maximum number of services to return
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Optional category ID to filter services
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *     responses:
 *       200:
 *         description: Residential services retrieved successfully
 *       400:
 *         description: Bad request - invalid limit or category
 *       500:
 *         description: Server error
 */
router.get('/residential', getResidentialServices);

/**
 * @swagger
 * /api/services/commercial:
 *   get:
 *     summary: Get commercial services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Optional maximum number of services to return
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Optional category ID to filter services
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *     responses:
 *       200:
 *         description: Commercial services retrieved successfully
 *       400:
 *         description: Bad request - invalid limit or category
 *       500:
 *         description: Server error
 */
router.get('/commercial', getCommercialServices);

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create or update a service (Admin only)
 *     description: Creates a new service if _id is not provided, or updates an existing service if _id is provided
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - unitType
 *               - category_id
 *               - min_time_required
 *               - availability
 *               - job_service_type
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Service ID (optional - if provided, updates existing service)
 *                 example: "64a1b2c3d4e5f6789abcdef0"
 *               name:
 *                 type: string
 *                 example: "AC Cleaning"
 *               description:
 *                 type: string
 *                 example: "Professional AC cleaning service"
 *               basePrice:
 *                 type: number
 *                 example: 500
 *                 description: Required when unitType is per_unit
 *               unitType:
 *                 type: string
 *                 enum: [per_unit, per_hour]
 *                 example: "per_unit"
 *               timeBasedPricing:
 *                 type: array
 *                 description: Required when unitType is per_hour
 *                 items:
 *                   type: object
 *                   properties:
 *                     hours:
 *                       type: integer
 *                       example: 2
 *                     price:
 *                       type: number
 *                       example: 300
 *               category_id:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789abcdef0"
 *               min_time_required:
 *                 type: number
 *                 example: 120
 *               availability:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
 *                 example: ["Mon", "Tue", "Wed", "Thu", "Fri"]
 *               job_service_type:
 *                 type: string
 *                 enum: [OnTime, Scheduled, Quotation]
 *                 example: "OnTime"
 *               order_name:
 *                 type: string
 *                 example: "Custom Order"
 *               price_type:
 *                 type: string
 *                 enum: [30min, 1hr, 1day, fixed]
 *                 example: "1hr"
 *               subservice_type:
 *                 type: string
 *                 enum: [single, multiple]
 *                 example: "single"
 *               subServices:
 *                 type: string
 *                 example: '[{"name":"AC Soft Cleaning","items":1,"rate":200,"max":1},{"name":"AC Deep Cleaning","items":1,"rate":350,"max":1}]'
 *                 description: JSON array of nested sub-services (for parent services)
 *               serviceImage:
 *                 type: string
 *                 format: binary
 *                 description: Service image file (optional)
 *               thumbnailUri:
 *                 type: string,
 *                 format: binary
 *                 description: S3 image URL for service icon (optional)
 *               serviceType:
 *                 type: string
 *                 enum: [residential, commercial]
 *                 example: "residential"
 *                 description: Service type - residential or commercial (defaults to "residential" if not provided)
 *               badge:
 *                 type: string
 *                 example: "🔥 New"
 *                 description: Optional badge text/emoji to display on the service (defaults to empty string)
 *     responses:
 *       201:
 *         description: Service created successfully
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
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     basePrice:
 *                       type: number
 *                     unitType:
 *                       type: string
 *                     imageUri:
 *                       type: string
 *                     service_icon:
 *                       type: string
 *                     category_id:
 *                       type: string
 *                     min_time_required:
 *                       type: number
 *                     availability:
 *                       type: array
 *                       items:
 *                         type: string
 *                     job_service_type:
 *                       type: string
 *                     order_name:
 *                       type: string
 *                     price_type:
 *                       type: string
 *                     subservice_type:
 *                       type: string
 *                     serviceType:
 *                       type: string
 *                       enum: [residential, commercial]
 *                     badge:
 *                       type: string
 *                       example: "🔥 New"
 *                     isActive:
 *                       type: boolean
 *                     createdBy:
 *                       type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  protect,
  isAdmin,
  upload.fields([
    { name: 'serviceImage', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  createServiceValidation,
  createService
);

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all active services with optional category filter
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: Category ID to filter services
 *         example: "64a1b2c3d4e5f6789abcdef0"
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
 *                 description:
 *                   type: string
 *                 content:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     exception:
 *                       type: string
 *                     description:
 *                       type: string
 *                     content:
 *                       type: object
 *                       properties:
 *                         services:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               basePrice:
 *                                 type: number
 *                               unitType:
 *                                 type: string
 *                               imageUri:
 *                                 type: string
 *                               service_icon:
 *                                 type: string
 *                               category_id:
 *                                 type: object
 *                                 properties:
 *                                   _id:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *                                   description:
 *                                     type: string
 *                               min_time_required:
 *                                 type: number
 *                               availability:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                               job_service_type:
 *                                 type: string
 *                               order_name:
 *                                 type: string
 *                               price_type:
 *                                 type: string
 *                               subservice_type:
 *                                 type: string
 *                               isActive:
 *                                 type: boolean
 *                               createdBy:
 *                                 type: object
 *                               createdAt:
 *                                 type: string
 *                               updatedAt:
 *                                 type: string
 *                         total:
 *                           type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, getServices);

/**
 * @swagger
 * /api/services/active:
 *   get:
 *     summary: Get all active services (Public endpoint)
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: All active services retrieved successfully
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
 *                   example: "All active services retrieved successfully"
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
 *                           unitType:
 *                             type: string
 *                             enum: [per_unit, per_hour]
 *                           imageUri:
 *                             type: string
 *                           service_icon:
 *                             type: string
 *                           category_id:
 *                             type: object
 *                           min_time_required:
 *                             type: number
 *                           availability:
 *                             type: array
 *                             items:
 *                               type: string
 *                           job_service_type:
 *                             type: string
 *                           order_name:
 *                             type: string
 *                           price_type:
 *                             type: string
 *                           subservice_type:
 *                             type: string
 *                           isFeatured:
 *                             type: boolean
 *                           serviceType:
 *                             type: string
 *                             enum: [residential, commercial]
 *                           badge:
 *                             type: string
 *                             example: "🔥 New"
 *                           isActive:
 *                             type: boolean
 *                           createdBy:
 *                             type: object
 *                           createdAt:
 *                             type: string
 *                           updatedAt:
 *                             type: string
 *                     total:
 *                       type: number
 *                       example: 15
 *       500:
 *         description: Server error
 */
router.get('/active', getAllActiveServices);

/**
 * @swagger
 * /api/services/home:
 *   get:
 *     summary: Get services of the INTERIOR RENOVATION category
 *     description: Returns all active services that belong to the INTERIOR RENOVATION category.
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: INTERIOR RENOVATION category services retrieved successfully
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
 *                   nullable: true
 *                   example: null
 *                 description:
 *                   type: string
 *                   example: INTERIOR RENOVATION category services retrieved successfully
 *                 content:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       icon:
 *                         type: string
 *                         nullable: true
 *                       price:
 *                         type: number
 *       500:
 *         description: Server error
 */
router.get('/home', getHomeCategoryServices);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get service by ID
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *         example: "64a1b2c3d4e5f6789abcdef1"
 *     responses:
 *       200:
 *         description: Service retrieved successfully
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
 *                     service:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         basePrice:
 *                           type: number
 *                         unitType:
 *                           type: string
 *                         imageUri:
 *                           type: string
 *                         service_icon:
 *                           type: string
 *                         category_id:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                         min_time_required:
 *                           type: number
 *                         availability:
 *                           type: array
 *                           items:
 *                             type: string
 *                         job_service_type:
 *                           type: string
 *                         order_name:
 *                           type: string
 *                         price_type:
 *                           type: string
 *                         subservice_type:
 *                           type: string
 *                         isActive:
 *                           type: boolean
 *                         createdBy:
 *                           type: object
 *                         createdAt:
 *                           type: string
 *                         updatedAt:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 */
/**
 * @swagger
 * /api/services/{id}/sub-services:
 *   get:
 *     summary: Get sub-services for a specific service
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *         example: "64a1b2c3d4e5f6789abcdef1"
 *     responses:
 *       200:
 *         description: Sub-services retrieved successfully
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
 *                   nullable: true
 *                   example: null
 *                 description:
 *                   type: string
 *                   example: "Sub-services retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceId:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef1"
 *                     serviceName:
 *                       type: string
 *                       example: "AC Cleaning"
 *                     subServices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "AC Soft Cleaning"
 *                           items:
 *                             type: number
 *                             example: 1
 *                           rate:
 *                             type: number
 *                             example: 200
 *                           max:
 *                             type: number
 *                             example: 1
 *       404:
 *         description: Service not found
 */
router.get('/:id/sub-services', getServiceSubServices);

router.get('/:id', protect, getServiceById);

/**
 * @swagger
 * /api/services/paginated:
 *   post:
 *     summary: Get services with pagination and optional category filter
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 example: 10
 *               category_id:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789abcdef0"
 *               sortBy:
 *                 type: string
 *                 enum: [createdAt, name, basePrice, updatedAt]
 *                 example: "createdAt"
 *               sortOrder:
 *                 type: string
 *                 enum: [asc, desc]
 *                 example: "desc"
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
 *                 exception:
 *                   type: string
 *                 description:
 *                   type: string
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
 *                           unitType:
 *                             type: string
 *                           imageUri:
 *                             type: string
 *                           service_icon:
 *                             type: string
 *                           category_id:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                   type: string
 *                           min_time_required:
 *                             type: number
 *                           availability:
 *                             type: array
 *                             items:
 *                               type: string
 *                           job_service_type:
 *                             type: string
 *                           order_name:
 *                             type: string
 *                           price_type:
 *                             type: string
 *                           subservice_type:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           createdBy:
 *                             type: object
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
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/paginated', protect, getServicesPaginatedValidation, getServicesPaginated);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Delete service (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *         example: "64a1b2c3d4e5f6789abcdef1"
 *     responses:
 *       200:
 *         description: Service deleted successfully
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
 *                     service:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         isActive:
 *                           type: boolean
 *       400:
 *         description: Bad request - Service is in use
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 exception:
 *                   type: string
 *                   example: "SERVICE_IN_USE"
 *                 description:
 *                   type: string
 *                   example: "Cannot delete service. It is being used by 5 service request(s)"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Service not found
 */
router.delete('/:id', protect, isAdmin, deleteService);

module.exports = router;

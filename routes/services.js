const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { authorize, isAdmin } = require('../middlewares/roleAuth');
const ROLES = require('../constants/roles');
const { createService, getServices, getServicesPaginated, getServiceById, deleteService, getAllActiveServices, upload } = require('../controllers/serviceController');

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
    .isFloat({ min: 0.01 })
    .withMessage('Base price must be a positive number'),
  body('unitType')
    .isIn(['per_unit', 'per_hour'])
    .withMessage('Unit type must be either "per_unit" or "per_hour"'),
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
    .withMessage('Order name must be between 2 and 100 characters'),
  body('price_type')
    .optional()
    .isIn(['30min', '1hr', '1day', 'fixed'])
    .withMessage('Price type must be 30min, 1hr, 1day, or fixed'),
  body('subservice_type')
    .optional()
    .isIn(['single', 'multiple'])
    .withMessage('Subservice type must be single or multiple')
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

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create a new service (Admin only)
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
 *               - basePrice
 *               - unitType
 *               - category_id
 *               - min_time_required
 *               - availability
 *               - job_service_type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "AC Cleaning"
 *               description:
 *                 type: string
 *                 example: "Professional AC cleaning service"
 *               basePrice:
 *                 type: number
 *                 example: 500
 *               unitType:
 *                 type: string
 *                 enum: [per_unit, per_hour]
 *                 example: "per_unit"
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
 *               serviceImage:
 *                 type: string
 *                 format: binary
 *                 description: Service image file (optional)
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
router.post('/', protect, isAdmin, upload.single('serviceImage'), createServiceValidation, createService);

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

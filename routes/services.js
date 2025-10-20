const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { authorize, isAdmin } = require('../middlewares/roleAuth');
const ROLES = require('../constants/roles');
const { createService, getServices, upload } = require('../controllers/serviceController');

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
    .withMessage('Unit type must be either "per_unit" or "per_hour"')
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
 *     summary: Get all active services
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       basePrice:
 *                         type: number
 *                       unitType:
 *                         type: string
 *                       imageUri:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       createdBy:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, getServices);

module.exports = router;

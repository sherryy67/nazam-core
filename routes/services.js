const express = require('express');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleAuth');
const ROLES = require('../constants/roles');
const { createService, getServices } = require('../controllers/serviceController');

const router = express.Router();

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create a new service
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
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/', protect, authorize(ROLES.ADMIN), createService);

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
 *                       isActive:
 *                         type: boolean
 *                       createdBy:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, getServices);

module.exports = router;

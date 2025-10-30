const express = require('express');
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const userRoutes = require('./users');
const uploadRoutes = require('./upload');
const serviceRoutes = require('./services');
const requestRoutes = require('./requests');
const categoryRoutes = require('./categories');
const serviceRequestRoutes = require('./serviceRequests');
const submitServiceRequestRoutes = require('./submitServiceRequest');
const { sendSuccess } = require('../utils/response');
const { getCategoryServiceSummary } = require('../controllers/categoryController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/services', serviceRoutes);
router.use('/requests', requestRoutes);
router.use('/categories', categoryRoutes);
router.use('/service-requests', serviceRequestRoutes);
router.use('/submit-service-requests', submitServiceRequestRoutes);

/**
 * @swagger
 * /api/getCategoryService:
 *   get:
 *     summary: Get categories with up to 3 services and total count
 *     description: Returns each active category with total active services count and up to 3 latest services.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category service summary retrieved successfully
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
 *                   example: Category service summary retrieved successfully
 *                 content:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "6700123abc..."
 *                       name:
 *                         type: string
 *                         example: "Home Cleaning"
 *                       totalServices:
 *                         type: number
 *                         example: 12
 *                       services:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "6700..."
 *                             name:
 *                               type: string
 *                               example: "Carpet Cleaning"
 *                             icon:
 *                               type: string
 *                               example: "https://.../icon.png"
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/getCategoryService - summarized categories with up to 3 services and total count (JWT protected)
router.get('/getCategoryService', protect, getCategoryServiceSummary);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Server is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-12-01T10:30:00.000Z"
 */
router.get('/health', (req, res) => {
  sendSuccess(res, 200, 'Server is running', {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;

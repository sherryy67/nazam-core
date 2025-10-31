const express = require('express');
const { body } = require('express-validator');
const { sendSuccess } = require('../utils/response');
const { adminLogin, createAdmin, adminActivateUser, adminDeactivateUser, getAllUsers } = require('../controllers/authController');
const { getEligibleVendors, assignServiceToVendor, unassignServiceFromVendor, getAssignedServices } = require('../controllers/adminController');
const { updateVendorAvailability } = require('../controllers/vendorController');
const { protect } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleAuth');

const router = express.Router();

// Admin login validation
const adminLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Admin creation validation
const adminCreateValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

/**
 * @swagger
 * /api/admin/status:
 *   get:
 *     summary: Get admin status
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Admin status retrieved successfully
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
 *                   example: "Admin module is available"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "available"
 */
/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *                 description: Admin email address
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: Admin password
 *     responses:
 *       200:
 *         description: Admin login successful
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
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                         email:
 *                           type: string
 *                           example: "admin@example.com"
 *                         role:
 *                           type: number
 *                           example: 3
 *                         name:
 *                           type: string
 *                           example: "Admin User"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Please provide an email and password"
 *                 error:
 *                   type: string
 *                   example: "MISSING_CREDENTIALS"
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid credentials"
 *                 error:
 *                   type: string
 *                   example: "INVALID_CREDENTIALS"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 error:
 *                   type: string
 *                   example: "INTERNAL_SERVER_ERROR"
 */
router.post('/login', adminLoginValidation, adminLogin);

/**
 * @swagger
 * /api/admin/create:
 *   post:
 *     summary: Create new admin
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Admin User"
 *                 description: Admin's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *                 description: Admin email address
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: Admin password (min 6 characters)
 *     responses:
 *       201:
 *         description: Admin created successfully
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
 *                   example: "Admin created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     admin:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                         name:
 *                           type: string
 *                           example: "Admin User"
 *                         email:
 *                           type: string
 *                           example: "admin@example.com"
 *                         role:
 *                           type: number
 *                           example: 3
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Name, email, and password are required"
 *                 error:
 *                   type: string
 *                   example: "MISSING_REQUIRED_FIELDS"
 *       409:
 *         description: Conflict - admin already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Admin with this email already exists"
 *                 error:
 *                   type: string
 *                   example: "ADMIN_EXISTS"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 error:
 *                   type: string
 *                   example: "INTERNAL_SERVER_ERROR"
 */
router.post('/create', adminCreateValidation, createAdmin);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination and filtering (Admin only)
 *     tags: [Admin]
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter users by name (case-insensitive search)
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         description: Filter users created from this date (ISO 8601 format)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: Filter users created until this date (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: "Users retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           phoneNumber:
 *                             type: string
 *                             example: "+971501234567"
 *                           role:
 *                             type: number
 *                             example: 1
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           isOTPVerified:
 *                             type: boolean
 *                             example: true
 *                           profilePic:
 *                             type: string
 *                             example: ""
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalCount:
 *                           type: integer
 *                           example: 50
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Bad request - invalid parameters
 *       401:
 *         description: Unauthorized - admin access required
 *       403:
 *         description: Forbidden - admin access required
 */
router.get('/users', protect, isAdmin, getAllUsers);

/**
 * @swagger
 * /api/admin/activate-user/{id}:
 *   put:
 *     summary: Activate user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User activated successfully
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
 *                   example: "User activated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *                 error:
 *                   type: string
 *                   example: "USER_NOT_FOUND"
 *       401:
 *         description: Unauthorized - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Admin access required"
 *                 error:
 *                   type: string
 *                   example: "ADMIN_REQUIRED"
 */
router.put('/activate-user/:id', protect, isAdmin, adminActivateUser);

/**
 * @swagger
 * /api/admin/deactivate-user/{id}:
 *   put:
 *     summary: Deactivate user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deactivated successfully
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
 *                   example: "User deactivated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         isActive:
 *                           type: boolean
 *                           example: false
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *                 error:
 *                   type: string
 *                   example: "USER_NOT_FOUND"
 *       401:
 *         description: Unauthorized - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Admin access required"
 *                 error:
 *                   type: string
 *                   example: "ADMIN_REQUIRED"
 */
router.put('/deactivate-user/:id', protect, isAdmin, adminDeactivateUser);

router.get('/status', (req, res) => {
  sendSuccess(res, 200, 'Admin module is available', {
    status: 'available',
    note: 'Authentication has been removed from this API'
  });
});

// Service Assignment Routes

/**
 * @swagger
 * /api/admin/eligible-vendors/{serviceId}:
 *   get:
 *     summary: Get eligible vendors for a specific service
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Eligible vendors retrieved successfully
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
 *                   example: "Eligible vendors retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                         name:
 *                           type: string
 *                           example: "Water Tank Cleaning"
 *                         description:
 *                           type: string
 *                           example: "Professional water tank cleaning service"
 *                         category:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "60f7b3b3b3b3b3b3b3b3b3b4"
 *                             name:
 *                               type: string
 *                               example: "Cleaning Services"
 *                         scheduledDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-10-28"
 *                         scheduledTime:
 *                           type: string
 *                           example: "14:00"
 *                         job_service_type:
 *                           type: string
 *                           example: "Scheduled"
 *                     eligibleVendors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60f7b3b3b3b3b3b3b3b3b3b5"
 *                           firstName:
 *                             type: string
 *                             example: "John"
 *                           lastName:
 *                             type: string
 *                             example: "Doe"
 *                           fullName:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           mobileNumber:
 *                             type: string
 *                             example: "+971501234567"
 *                           coveredCity:
 *                             type: string
 *                             example: "Dubai"
 *                           primaryService:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
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
 *                           availabilitySchedule:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 dayOfWeek:
 *                                   type: string
 *                                   example: "Mon"
 *                                 startTime:
 *                                   type: string
 *                                   example: "09:00"
 *                                 endTime:
 *                                   type: string
 *                                   example: "18:00"
 *                           privilege:
 *                             type: string
 *                             example: "Professional"
 *                           experience:
 *                             type: number
 *                             example: 5
 *                           profilePic:
 *                             type: string
 *                             example: "https://example.com/profile.jpg"
 *                     totalEligibleVendors:
 *                       type: number
 *                       example: 3
 *       400:
 *         description: Bad request
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
 *                   example: "Service is already assigned to a vendor"
 *                 exception:
 *                   type: string
 *                   example: "SERVICE_ALREADY_ASSIGNED"
 *       404:
 *         description: Service not found
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
 *                   example: "Service not found"
 *                 exception:
 *                   type: string
 *                   example: "NOT_FOUND"
 *       401:
 *         description: Unauthorized - admin access required
 */
router.get('/eligible-vendors/:serviceId', protect, isAdmin, getEligibleVendors);

/**
 * @swagger
 * /api/admin/assign-service:
 *   post:
 *     summary: Assign service to a vendor
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorId
 *               - serviceId
 *             properties:
 *               vendorId:
 *                 type: string
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b5"
 *                 description: Vendor ID
 *               serviceId:
 *                 type: string
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                 description: Service ID
 *     responses:
 *       200:
 *         description: Service assigned to vendor successfully
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
 *                   example: "Service assigned to vendor successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                         name:
 *                           type: string
 *                           example: "Water Tank Cleaning"
 *                         description:
 *                           type: string
 *                           example: "Professional water tank cleaning service"
 *                         category:
 *                           type: object
 *                         vendor:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "60f7b3b3b3b3b3b3b3b3b3b5"
 *                             firstName:
 *                               type: string
 *                               example: "John"
 *                             lastName:
 *                               type: string
 *                               example: "Doe"
 *                             email:
 *                               type: string
 *                               example: "john@example.com"
 *                             mobileNumber:
 *                               type: string
 *                               example: "+971501234567"
 *                         isAssigned:
 *                           type: boolean
 *                           example: true
 *                         assignedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *                     vendor:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b5"
 *                         firstName:
 *                           type: string
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           example: "Doe"
 *                         fullName:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         mobileNumber:
 *                           type: string
 *                           example: "+971501234567"
 *                         coveredCity:
 *                           type: string
 *                           example: "Dubai"
 *       400:
 *         description: Bad request
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
 *                   example: "Vendor is not eligible for this service"
 *                 exception:
 *                   type: string
 *                   example: "VENDOR_NOT_ELIGIBLE"
 *       404:
 *         description: Vendor or service not found
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
 *                   example: "Vendor not found"
 *                 exception:
 *                   type: string
 *                   example: "NOT_FOUND"
 *       401:
 *         description: Unauthorized - admin access required
 */
router.post('/assign-service', protect, isAdmin, assignServiceToVendor);

/**
 * @swagger
 * /api/admin/unassign-service/{serviceId}:
 *   delete:
 *     summary: Unassign service from vendor
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service unassigned from vendor successfully
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
 *                   example: "Service unassigned from vendor successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                         name:
 *                           type: string
 *                           example: "Water Tank Cleaning"
 *                         isAssigned:
 *                           type: boolean
 *                           example: false
 *                         vendorId:
 *                           type: null
 *                           example: null
 *                     previousVendor:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b5"
 *                         firstName:
 *                           type: string
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           example: "Doe"
 *                         fullName:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *       400:
 *         description: Bad request
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
 *                   example: "Service is not currently assigned to any vendor"
 *                 exception:
 *                   type: string
 *                   example: "SERVICE_NOT_ASSIGNED"
 *       404:
 *         description: Service not found
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
 *                   example: "Service not found"
 *                 exception:
 *                   type: string
 *                   example: "NOT_FOUND"
 *       401:
 *         description: Unauthorized - admin access required
 */
router.delete('/unassign-service/:serviceId', protect, isAdmin, unassignServiceFromVendor);

/**
 * @swagger
 * /api/admin/assigned-services:
 *   get:
 *     summary: Get all assigned services
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Number of services per page
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *         description: Filter by vendor ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *     responses:
 *       200:
 *         description: Assigned services retrieved successfully
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
 *                   example: "Assigned services retrieved successfully"
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
 *                             example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                           name:
 *                             type: string
 *                             example: "Water Tank Cleaning"
 *                           description:
 *                             type: string
 *                             example: "Professional water tank cleaning service"
 *                           vendorId:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: "60f7b3b3b3b3b3b3b3b3b3b5"
 *                               firstName:
 *                                 type: string
 *                                 example: "John"
 *                               lastName:
 *                                 type: string
 *                                 example: "Doe"
 *                               email:
 *                                 type: string
 *                                 example: "john@example.com"
 *                               mobileNumber:
 *                                 type: string
 *                                 example: "+971501234567"
 *                               coveredCity:
 *                                 type: string
 *                                 example: "Dubai"
 *                           category_id:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: "60f7b3b3b3b3b3b3b3b3b3b4"
 *                               name:
 *                                 type: string
 *                                 example: "Cleaning Services"
 *                               description:
 *                                 type: string
 *                                 example: "Professional cleaning services"
 *                           isAssigned:
 *                             type: boolean
 *                             example: true
 *                           assignedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                           example: 1
 *                         totalPages:
 *                           type: number
 *                           example: 5
 *                         totalServices:
 *                           type: number
 *                           example: 50
 *                         servicesPerPage:
 *                           type: number
 *                           example: 10
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized - admin access required
 */
router.get('/assigned-services', protect, isAdmin, getAssignedServices);

/**
 * @swagger
 * /api/admin/vendor/{vendorId}/availability:
 *   put:
 *     summary: Update vendor availability schedule
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               availabilitySchedule:
 *                 type: array
 *                 description: Vendor's weekly availability schedule
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek:
 *                       type: string
 *                       enum: [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
 *                       example: "Mon"
 *                     startTime:
 *                       type: string
 *                       pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                       example: "09:00"
 *                       description: Start time in HH:MM format (24-hour)
 *                     endTime:
 *                       type: string
 *                       pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                       example: "18:00"
 *                       description: End time in HH:MM format (24-hour)
 *                 example:
 *                   - dayOfWeek: "Mon"
 *                     startTime: "09:00"
 *                     endTime: "18:00"
 *                   - dayOfWeek: "Tue"
 *                     startTime: "09:00"
 *                     endTime: "18:00"
 *                   - dayOfWeek: "Wed"
 *                     startTime: "09:00"
 *                     endTime: "18:00"
 *                   - dayOfWeek: "Thu"
 *                     startTime: "09:00"
 *                     endTime: "18:00"
 *                   - dayOfWeek: "Fri"
 *                     startTime: "09:00"
 *                     endTime: "18:00"
 *               unavailableDates:
 *                 type: array
 *                 description: Specific dates when vendor is unavailable
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2024-12-25"
 *                     reason:
 *                       type: string
 *                       example: "Holiday"
 *     responses:
 *       200:
 *         description: Vendor availability updated successfully
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
 *                   example: "Vendor availability updated successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     vendor:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60f7b3b3b3b3b3b3b3b3b3b5"
 *                         firstName:
 *                           type: string
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           example: "Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         availabilitySchedule:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               dayOfWeek:
 *                                 type: string
 *                                 example: "Mon"
 *                               startTime:
 *                                 type: string
 *                                 example: "09:00"
 *                               endTime:
 *                                 type: string
 *                                 example: "18:00"
 *                         unavailableDates:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                                 example: "2024-12-25"
 *                               reason:
 *                                 type: string
 *                                 example: "Holiday"
 *       400:
 *         description: Bad request
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
 *                   example: "Invalid availabilitySchedule format"
 *                 exception:
 *                   type: string
 *                   example: "INVALID_AVAILABILITY_SCHEDULE"
 *       404:
 *         description: Vendor not found
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
 *                   example: "Vendor not found"
 *                 exception:
 *                   type: string
 *                   example: "NOT_FOUND"
 *       401:
 *         description: Unauthorized - admin access required
 */
router.put('/vendor/:vendorId/availability', protect, isAdmin, updateVendorAvailability);

module.exports = router;

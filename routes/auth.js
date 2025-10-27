const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  adminCreateVendor,
  getAllVendors,
  sendOTP,
  verifyOTP,
  resendOTP,
  verifyOTPOnly,
  createAccount,
  upload
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { authorize, isAdmin } = require('../middlewares/roleAuth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn([1, 2])
    .withMessage('Role must be 1 (user) or 2 (vendor)'),
  body('phoneNumber')
    .if(body('role').equals(1))
    .isMobilePhone('ar-AE')
    .withMessage('Please provide a valid UAE phone number for user registration')
];

// User registration validation
const userRegisterValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phoneNumber')
    .isMobilePhone('ar-AE')
    .withMessage('Please provide a valid UAE phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Vendor registration validation
const vendorRegisterValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('type')
    .isIn(['corporate', 'individual'])
    .withMessage('Type must be corporate or individual'),
  body('coveredCity')
    .notEmpty()
    .withMessage('Covered city is required'),
  body('serviceId')
    .isMongoId()
    .withMessage('Service ID must be a valid MongoDB ObjectId'),
  body('countryCode')
    .notEmpty()
    .withMessage('Country code is required'),
  body('mobileNumber')
    .isMobilePhone()
    .withMessage('Please provide a valid mobile number'),
  body('idType')
    .isIn(['Passport', 'EmiratesID', 'NationalID'])
    .withMessage('ID type must be Passport, EmiratesID, or NationalID'),
  body('idNumber')
    .notEmpty()
    .withMessage('ID number is required')
];

const loginValidation = [
  body('email')
    .if(body('role').not().equals(1))
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email for vendor/admin login'),
  body('phoneNumber')
    .if(body('role').equals(1))
    .isMobilePhone('ar-AE')
    .withMessage('Please provide a valid UAE phone number for user login'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('role')
    .isIn([1, 2, 3])
    .withMessage('Role must be 1 (user), 2 (vendor), or 3 (admin)')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// OTP validation rules
const sendOTPValidation = [
  body('phoneNumber')
    .isMobilePhone('ar-AE')
    .withMessage('Please provide a valid UAE phone number')
];

const verifyOTPValidation = [
  body('phoneNumber')
    .isMobilePhone('ar-AE')
    .withMessage('Please provide a valid UAE phone number'),
  body('otpCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP code must be 6 digits'),
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

const resendOTPValidation = [
  body('phoneNumber')
    .isMobilePhone('ar-AE')
    .withMessage('Please provide a valid UAE phone number')
];

const verifyOTPOnlyValidation = [
  body('phoneNumber')
    .isMobilePhone('ar-AE')
    .withMessage('Please provide a valid UAE phone number'),
  body('otpCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP code must be 6 digits')
];

const createAccountValidation = [
  body('phoneNumber')
    .isMobilePhone('ar-AE')
    .withMessage('Please provide a valid UAE phone number'),
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
 * /api/auth/register:
 *   post:
 *     summary: Register a new user or vendor
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/UserRegisterRequest'
 *               - $ref: '#/components/schemas/VendorRegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation error
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
router.post('/register', registerValidation, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid credentials
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
router.post('/login', loginValidation, login);

/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized - no token provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/logout', protect, logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - $ref: '#/components/schemas/Vendor'
 *                     - $ref: '#/components/schemas/Admin'
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/updatedetails:
 *   put:
 *     summary: Update user details
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDetailsRequest'
 *     responses:
 *       200:
 *         description: User details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - $ref: '#/components/schemas/Vendor'
 *                     - $ref: '#/components/schemas/Admin'
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/updatedetails', protect, updateDetails);

/**
 * @swagger
 * /api/auth/updatepassword:
 *   put:
 *     summary: Update user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePasswordRequest'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/updatepassword', protect, updatePasswordValidation, updatePassword);

/**
 * @swagger
 * /api/auth/admin/create-vendor:
 *   post:
 *     summary: Admin create vendor
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - type
 *               - coveredCity
 *               - serviceId
 *               - countryCode
 *               - mobileNumber
 *               - idType
 *               - idNumber
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               type:
 *                 type: string
 *                 enum: [corporate, individual]
 *                 example: "individual"
 *               coveredCity:
 *                 type: string
 *                 example: "Dubai"
 *               serviceId:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789abcdef1"
 *               countryCode:
 *                 type: string
 *                 example: "+971"
 *               mobileNumber:
 *                 type: string
 *                 example: "501234567"
 *               idType:
 *                 type: string
 *                 enum: [Passport, EmiratesID, NationalID]
 *                 example: "EmiratesID"
 *               idNumber:
 *                 type: string
 *                 example: "784-1234-5678901-2"
 *               company:
 *                 type: string
 *                 example: "ABC Company"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 example: "Male"
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               privilege:
 *                 type: string
 *                 enum: [Beginner, Experienced, Professional]
 *                 example: "Experienced"
 *               profilePic:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture file (optional)
 *               experience:
 *                 type: number
 *                 example: 5
 *               bankName:
 *                 type: string
 *                 example: "Emirates NBD"
 *               branchName:
 *                 type: string
 *                 example: "Dubai Mall Branch"
 *               bankAccountNumber:
 *                 type: string
 *                 example: "1234567890"
 *               iban:
 *                 type: string
 *                 example: "AE070331234567890123456"
 *               personalIdNumber:
 *                 type: string
 *                 example: "123456789"
 *               address:
 *                 type: string
 *                 example: "123 Main Street, Dubai"
 *               country:
 *                 type: string
 *                 example: "UAE"
 *               city:
 *                 type: string
 *                 example: "Dubai"
 *               pinCode:
 *                 type: string
 *                 example: "12345"
 *               serviceAvailability:
 *                 type: string
 *                 enum: [Full-time, Part-time]
 *                 example: "Full-time"
 *               vatRegistration:
 *                 type: boolean
 *                 example: true
 *               collectTax:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Vendor created successfully by admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *       401:
 *         description: Unauthorized - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/admin/create-vendor', protect, isAdmin, upload.single('profilePic'), vendorRegisterValidation, adminCreateVendor);

/**
 * @swagger
 * /api/auth/admin/vendors:
 *   get:
 *     summary: Get all vendors (Admin only)
 *     tags: [Authentication]
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
 *         description: Number of vendors per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or mobile number
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [corporate, individual]
 *         description: Filter by vendor type
 *       - in: query
 *         name: coveredCity
 *         schema:
 *           type: string
 *         description: Filter by covered city
 *     responses:
 *       200:
 *         description: All vendors retrieved successfully
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
 *                   example: "All vendors retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     vendors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [corporate, individual]
 *                           company:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           coveredCity:
 *                             type: string
 *                           serviceId:
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
 *                           email:
 *                             type: string
 *                           mobileNumber:
 *                             type: string
 *                           profilePic:
 *                             type: string
 *                           approved:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                           updatedAt:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalVendors:
 *                           type: number
 *                         vendorsPerPage:
 *                           type: number
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Server error
 */
router.get('/admin/vendors', protect, isAdmin, getAllVendors);

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to phone number (Step 1 of registration)
 *     description: Send OTP to phone number for verification. After receiving OTP, use verify-otp endpoint to create account.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+971501234567"
 *                 description: UAE phone number with country code
 *     responses:
 *       200:
 *         description: OTP sent successfully
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
 *                   example: "OTP sent successfully to your phone number"
 *                 content:
 *                   type: object
 *                   properties:
 *                     phoneNumber:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *                       example: "5 minutes"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: SMS sending failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/send-otp', sendOTPValidation, sendOTP);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and create user account (Step 2 of registration)
 *     description: After sending OTP to phone number, use this endpoint to verify OTP and create user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - otpCode
 *               - name
 *               - email
 *               - password
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+971501234567"
 *                 description: UAE phone number with country code
 *               otpCode:
 *                 type: string
 *                 example: "123456"
 *                 description: 6-digit OTP code
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: User's password (min 6 characters)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation error or invalid OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: User already exists
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
router.post('/verify-otp', verifyOTPValidation, verifyOTP);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP to phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+971501234567"
 *                 description: UAE phone number with country code
 *     responses:
 *       200:
 *         description: OTP resent successfully
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
 *                   example: "OTP resent successfully to your phone number"
 *                 content:
 *                   type: object
 *                   properties:
 *                     phoneNumber:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *                       example: "5 minutes"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: SMS sending failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/resend-otp', resendOTPValidation, resendOTP);

/**
 * @swagger
 * /api/auth/verify-otp-only:
 *   post:
 *     summary: Verify OTP only (Step 2 of registration)
 *     description: Verify OTP code for phone number. Must be called before account creation.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - otpCode
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+971501234567"
 *                 description: UAE phone number with country code
 *               otpCode:
 *                 type: string
 *                 example: "123456"
 *                 description: 6-digit OTP code
 *     responses:
 *       200:
 *         description: OTP verified successfully
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
 *                   example: "OTP verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     phoneNumber:
 *                       type: string
 *                       example: "+971501234567"
 *                     verified:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "You can now proceed with account creation"
 *       400:
 *         description: Bad request - validation error or invalid OTP
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
 *                   example: "Invalid or expired OTP code"
 *                 error:
 *                   type: string
 *                   example: "INVALID_OTP"
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
router.post('/verify-otp-only', verifyOTPOnlyValidation, verifyOTPOnly);

/**
 * @swagger
 * /api/auth/create-account:
 *   post:
 *     summary: Create user account (Step 3 of registration)
 *     description: Create user account after OTP verification. Phone number must be verified first.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - name
 *               - email
 *               - password
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+971501234567"
 *                 description: UAE phone number (must be verified with OTP first)
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: User's password (min 6 characters)
 *     responses:
 *       201:
 *         description: Account created successfully
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
 *                   example: "User registered successfully"
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
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         phoneNumber:
 *                           type: string
 *                           example: "+971501234567"
 *                         role:
 *                           type: number
 *                           example: 1
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         isOTPVerified:
 *                           type: boolean
 *                           example: true
 *                         profilePic:
 *                           type: string
 *                           example: ""
 *       400:
 *         description: Bad request - validation error or phone not verified
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
 *                   example: "Phone number must be verified with OTP before creating account"
 *                 error:
 *                   type: string
 *                   example: "PHONE_NOT_VERIFIED"
 *       409:
 *         description: User already exists
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
 *                   example: "User with this phone number or email already exists"
 *                 error:
 *                   type: string
 *                   example: "USER_EXISTS"
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
router.post('/create-account', createAccountValidation, createAccount);

module.exports = router;

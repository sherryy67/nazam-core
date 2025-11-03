const express = require('express');
const { body } = require('express-validator');
const { getProfile, updateProfile, deleteProfilePicture, updatePassword, testS3, upload } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { isUser } = require('../middlewares/roleAuth');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
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
 *                 message:
 *                   type: string
 *                   example: "User profile retrieved successfully"
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
 *                           example: "https://bucket.s3.amazonaws.com/profile-pictures/user123/image.jpg"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized - invalid token
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
 *                   example: "Not authorized to access this route"
 *                 error:
 *                   type: string
 *                   example: "NO_TOKEN"
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
 */
router.get('/profile', protect, isUser, getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   post:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *                 description: User's full name
 *               profilePic:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture image file (JPEG, JPG, PNG, GIF)
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: "Profile updated successfully"
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
 *                           example: "https://bucket.s3.amazonaws.com/profile-pictures/user123/image.jpg"
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
 *                   example: "Name must be between 2 and 50 characters"
 *                 error:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *       401:
 *         description: Unauthorized - invalid token
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
 *                   example: "Not authorized to access this route"
 *                 error:
 *                   type: string
 *                   example: "NO_TOKEN"
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
 *       500:
 *         description: Server error - S3 upload failed
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
 *                   example: "Failed to upload profile picture"
 *                 error:
 *                   type: string
 *                   example: "S3_UPLOAD_FAILED"
 */
router.post('/profile', protect, isUser, upload.single('profilePic'), updateProfileValidation, updateProfile);

/**
 * @swagger
 * /api/users/profile/picture:
 *   delete:
 *     summary: Delete user profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile picture deleted successfully
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
 *                   example: "Profile picture deleted successfully"
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
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized - invalid token
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
 *                   example: "Not authorized to access this route"
 *                 error:
 *                   type: string
 *                   example: "NO_TOKEN"
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
 */
router.delete('/profile/picture', protect, isUser, deleteProfilePicture);

/**
 * @swagger
 * /api/users/test-s3:
 *   get:
 *     summary: Test S3 configuration
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: S3 configuration test successful
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
 *                   example: "S3 configuration test successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sdkVersion:
 *                       type: string
 *                       example: "v3"
 *                     bucket:
 *                       type: string
 *                       example: "my-bucket"
 *                     region:
 *                       type: string
 *                       example: "us-east-1"
 *                     result:
 *                       type: object
 *       500:
 *         description: S3 test failed
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
 *                   example: "S3 test failed: Access Denied"
 *                 error:
 *                   type: string
 *                   example: "S3_TEST_FAILED"
 */
router.get('/test-s3', protect, isUser, testS3);

/**
 * @swagger
 * /api/users/update-password:
 *   put:
 *     summary: Update user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "oldPassword123"
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 example: "newPassword123"
 *                 description: New password (must be at least 6 characters long)
 *     responses:
 *       200:
 *         description: Password updated successfully
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
 *                   example: "Password updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Password has been updated successfully"
 *       400:
 *         description: Bad request - validation error or same password
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
 *                   example: "Current password and new password are required"
 *                 error:
 *                   type: string
 *                   example: "MISSING_REQUIRED_FIELDS"
 *       401:
 *         description: Unauthorized - invalid token or incorrect current password
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
 *                   example: "Current password is incorrect"
 *                 error:
 *                   type: string
 *                   example: "INCORRECT_PASSWORD"
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
 */
router.put('/update-password', protect, isUser, updatePasswordValidation, updatePassword);

module.exports = router;

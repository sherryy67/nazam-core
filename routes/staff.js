const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { isStaff, hasPermission } = require('../middlewares/roleAuth');
const {
  createStaff,
  getAllStaff,
  getStaffById,
  getStaffProfile,
  updateStaff,
  toggleStaffStatus,
  updateStaffPermissions,
  deleteStaff,
} = require('../controllers/staffController');

const router = express.Router();

// Validation rules
const createStaffValidation = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('roleId').notEmpty().withMessage('Role ID is required').isMongoId().withMessage('Invalid role ID'),
];

const updateStaffValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('roleId').optional().isMongoId().withMessage('Invalid role ID'),
];

const toggleStatusValidation = [
  body('isActive').notEmpty().withMessage('isActive is required')
    .isBoolean().withMessage('isActive must be a boolean'),
];

const updatePermissionsValidation = [
  body('grant').optional().isArray().withMessage('grant must be an array'),
  body('revoke').optional().isArray().withMessage('revoke must be an array'),
];

// GET /api/staff/me — any staff can see their own profile (must be before /:id)
router.get('/me', protect, isStaff, getStaffProfile);

// GET /api/staff
router.get('/', protect, isStaff, hasPermission('staff:read'), getAllStaff);

// GET /api/staff/:id
router.get('/:id', protect, isStaff, hasPermission('staff:read'), getStaffById);

// POST /api/staff
router.post('/', protect, isStaff, hasPermission('staff:write'), createStaffValidation, createStaff);

// PUT /api/staff/:id
router.put('/:id', protect, isStaff, hasPermission('staff:write'), updateStaffValidation, updateStaff);

// PATCH /api/staff/:id/status
router.patch('/:id/status', protect, isStaff, hasPermission('staff:write'), toggleStatusValidation, toggleStaffStatus);

// PATCH /api/staff/:id/permissions
router.patch('/:id/permissions', protect, isStaff, hasPermission('staff:write'), updatePermissionsValidation, updateStaffPermissions);

// DELETE /api/staff/:id
router.delete('/:id', protect, isStaff, hasPermission('staff:delete'), deleteStaff);

module.exports = router;

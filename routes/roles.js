const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { isStaff, hasPermission } = require('../middlewares/roleAuth');
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
} = require('../controllers/roleController');

const router = express.Router();

// Validation rules
const createRoleValidation = [
  body('name').trim().notEmpty().withMessage('Role name is required'),
  body('slug').trim().notEmpty().withMessage('Role slug is required')
    .matches(/^[a-z0-9_]+$/).withMessage('Slug must be lowercase alphanumeric with underscores'),
  body('code').isInt({ min: 3 }).withMessage('Role code must be an integer >= 3'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
];

const updateRoleValidation = [
  body('name').optional().trim().notEmpty().withMessage('Role name cannot be empty'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

// GET /api/roles/permissions/all — must be before /:id to avoid route conflict
router.get('/permissions/all', protect, isStaff, hasPermission('roles:read'), getAllPermissions);

// GET /api/roles
router.get('/', protect, isStaff, hasPermission('roles:read'), getAllRoles);

// GET /api/roles/:id
router.get('/:id', protect, isStaff, hasPermission('roles:read'), getRoleById);

// POST /api/roles
router.post('/', protect, isStaff, hasPermission('roles:write'), createRoleValidation, createRole);

// PUT /api/roles/:id
router.put('/:id', protect, isStaff, hasPermission('roles:write'), updateRoleValidation, updateRole);

// DELETE /api/roles/:id
router.delete('/:id', protect, isStaff, hasPermission('roles:delete'), deleteRole);

module.exports = router;

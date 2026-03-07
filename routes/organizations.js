const express = require('express');
const { protect } = require('../middlewares/auth');
const { isAdmin, isOrganization, isOrganizationOrAdmin } = require('../middlewares/roleAuth');
const {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  createVendorForOrganization,
  getOrganizationVendors,
  getOrganizationDashboard,
  organizationLogin
} = require('../controllers/organizationController');

const router = express.Router();

// Public
router.post('/login', organizationLogin);

// Organization-specific routes (must be before /:id)
router.get('/dashboard', protect, isOrganization, getOrganizationDashboard);
router.get('/vendors', protect, isOrganization, getOrganizationVendors);
router.post('/vendors', protect, isOrganization, createVendorForOrganization);

// Admin routes
router.post('/', protect, isAdmin, createOrganization);
router.get('/', protect, isAdmin, getAllOrganizations);
router.get('/:id', protect, isOrganizationOrAdmin, getOrganizationById);
router.put('/:id', protect, isAdmin, updateOrganization);

module.exports = router;

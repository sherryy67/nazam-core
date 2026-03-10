const express = require('express');
const { protect } = require('../middlewares/auth');
const { isAdmin, isPropertyOwner, isPropertyOwnerOrAdmin } = require('../middlewares/roleAuth');
const {
  createPropertyOwner,
  getAllPropertyOwners,
  propertyOwnerLogin,
  createProperty,
  getProperties,
  getPropertyById,
  createUnit,
  bulkCreateUnits,
  getPropertyOwnerDashboard,
  getPropertyOwnerServiceRequests,
  createServiceRequestOnBehalf
} = require('../controllers/propertyController');

const router = express.Router();

// Public
router.post('/owners/login', propertyOwnerLogin);

// Property Owner specific routes
router.get('/owner/dashboard', protect, isPropertyOwner, getPropertyOwnerDashboard);
router.get('/owner/service-requests', protect, isPropertyOwner, getPropertyOwnerServiceRequests);
router.post('/owner/service-requests', protect, isPropertyOwner, createServiceRequestOnBehalf);

// Admin routes - Property Owners
router.post('/owners', protect, isAdmin, createPropertyOwner);
router.get('/owners', protect, isAdmin, getAllPropertyOwners);

// Admin routes - Properties
router.post('/', protect, isAdmin, createProperty);
router.get('/', protect, isPropertyOwnerOrAdmin, getProperties);
router.get('/:id', protect, isPropertyOwnerOrAdmin, getPropertyById);

// Admin routes - Units
router.post('/:propertyId/units', protect, isAdmin, createUnit);
router.post('/:propertyId/units/bulk', protect, isAdmin, bulkCreateUnits);

module.exports = router;

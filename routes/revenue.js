const express = require('express');
const { protect } = require('../middlewares/auth');
const { isAdmin, isOrganization, isPropertyOwner } = require('../middlewares/roleAuth');
const {
  getAllRevenue,
  updateRevenueStatus,
  getOrganizationRevenue,
  getPropertyOwnerRevenue
} = require('../controllers/revenueController');

const router = express.Router();

// Admin routes
router.get('/', protect, isAdmin, getAllRevenue);
router.put('/:id/status', protect, isAdmin, updateRevenueStatus);

// Organization route
router.get('/organization', protect, isOrganization, getOrganizationRevenue);

// Property Owner route
router.get('/property-owner', protect, isPropertyOwner, getPropertyOwnerRevenue);

module.exports = router;

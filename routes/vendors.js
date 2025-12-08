const express = require('express');
const router = express.Router();

// Import controllers
const {
  updateVendorAvailability,
  submitVendorKYC,
  verifyVendorKYC,
  getVendorKYCStatus,
  updateVendorBanking,
  verifyVendorBanking,
  getVendorBankingStatus,
  updateVendorWeeklySchedule,
  blockVendorDates,
  getVendorAvailability,
  getVendorProfile,
  updateVendorProfile,
  updateVendorRequestStatus,
  getVendorRequests,
  deactivateVendorAccount,
  activateVendorAccount
} = require('../controllers/vendorController');

// Import middlewares
const { protect } = require('../middleware/auth');
const { isVendor } = require('../middleware/roles');
const { isAdmin } = require('../middleware/roles');

// Vendor self-management routes (protected vendor routes)
router.use(protect); // All routes require authentication
router.use(isVendor); // All routes require vendor role

// Profile management
router.get('/me', getVendorProfile);
router.patch('/me', updateVendorProfile);

// KYC management
router.get('/me/kyc', getVendorKYCStatus);
router.patch('/me/kyc', submitVendorKYC);

// Banking management
router.get('/me/banking', getVendorBankingStatus);
router.patch('/me/banking', updateVendorBanking);

// Availability management
router.get('/me/availability', getVendorAvailability);
router.patch('/me/availability/weekly', updateVendorWeeklySchedule);
router.post('/me/availability/block-dates', blockVendorDates);

// Service request management
router.get('/me/requests', getVendorRequests);
router.patch('/me/requests/:requestId/status', updateVendorRequestStatus);

// Account status management (vendor-initiated)
router.patch('/me/deactivate', deactivateVendorAccount);
router.patch('/me/activate', activateVendorAccount);

// Admin vendor management routes (admin only)
router.patch('/:vendorId/kyc-verify', isAdmin, verifyVendorKYC);
router.patch('/:vendorId/banking-verify', isAdmin, verifyVendorBanking);

// Legacy admin route for availability (keeping for backward compatibility)
router.put('/:vendorId/availability', isAdmin, updateVendorAvailability);

module.exports = router;

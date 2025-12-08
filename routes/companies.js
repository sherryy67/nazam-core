const express = require('express');
const router = express.Router();

// Import controllers
const {
  registerCompany,
  loginCompany,
  submitCompanyKYC,
  verifyCompanyKYC,
  getCompanyProfile,
  addStaffVendor,
  getCompanyStaff,
  updateCompanyBanking,
  verifyCompanyBanking
} = require('../controllers/companyController');

// Import middlewares
const { protect } = require('../middleware/auth');
const { isCompanyAdmin } = require('../middleware/roles');
const { isAdmin } = require('../middleware/roles');

// Public routes
router.post('/register', registerCompany);
router.post('/login', loginCompany);

// Company admin routes (protected)
router.use(protect); // All routes below require authentication

// Company self-management
router.get('/me', isCompanyAdmin, getCompanyProfile);
router.patch('/me/kyc', isCompanyAdmin, submitCompanyKYC);
router.patch('/me/banking', isCompanyAdmin, updateCompanyBanking);

// Staff management
router.post('/:companyId/staff', isCompanyAdmin, addStaffVendor);
router.get('/:companyId/staff', isCompanyAdmin, getCompanyStaff);

// Admin company management routes (admin only)
router.patch('/:companyId/kyc-verify', isAdmin, verifyCompanyKYC);
router.patch('/:companyId/banking-verify', isAdmin, verifyCompanyBanking);

module.exports = router;

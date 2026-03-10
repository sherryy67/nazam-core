const express = require('express');
const { protect } = require('../middlewares/auth');
const { isPropertyOwner, isUser } = require('../middlewares/roleAuth');
const {
  generateReferralCode,
  getMyReferralCodes,
  redeemReferralCode,
  deactivateReferralCode
} = require('../controllers/referralCodeController');

const router = express.Router();

// Property Owner routes
router.post('/', protect, isPropertyOwner, generateReferralCode);
router.get('/', protect, isPropertyOwner, getMyReferralCodes);
router.put('/:id/deactivate', protect, isPropertyOwner, deactivateReferralCode);

// User/Tenant route
router.post('/redeem', protect, isUser, redeemReferralCode);

module.exports = router;

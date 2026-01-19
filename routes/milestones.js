const express = require('express');
const router = express.Router();
const {
  createMilestones,
  getMilestones,
  updateMilestone,
  deleteMilestone,
  generateMilestonePaymentLink,
  getMilestoneByToken
} = require('../controllers/milestoneController');

// Public routes
router.get('/payment-link/:token', getMilestoneByToken);

// Service request milestone routes (add authentication middleware as needed)
router.post('/service-requests/:id/milestones', createMilestones);
router.get('/service-requests/:id/milestones', getMilestones);
router.put('/service-requests/:id/milestones/:milestoneId', updateMilestone);
router.delete('/service-requests/:id/milestones/:milestoneId', deleteMilestone);
router.post('/service-requests/:id/milestones/:milestoneId/payment-link', generateMilestonePaymentLink);

module.exports = router;

const express = require('express');
const { protect } = require('../middlewares/auth');
const { isAdmin, isVendor, isVendorOrAdmin } = require('../middlewares/roleAuth');
const {
  createTask,
  getAllTasks,
  getVendorTasks,
  acceptTask,
  cancelTask,
  startTask,
  completeTask,
  getTaskById
} = require('../controllers/taskController');

const router = express.Router();

// Admin routes
router.post('/', protect, isAdmin, createTask);
router.get('/', protect, isAdmin, getAllTasks);

// Vendor routes
router.get('/my-tasks', protect, isVendor, getVendorTasks);
router.put('/:taskId/accept', protect, isVendor, acceptTask);
router.put('/:taskId/cancel', protect, isVendor, cancelTask);
router.put('/:taskId/start', protect, isVendor, startTask);
router.put('/:taskId/complete', protect, isVendor, completeTask);

// Shared routes
router.get('/:taskId', protect, isVendorOrAdmin, getTaskById);

module.exports = router;

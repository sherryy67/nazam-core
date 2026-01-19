const ServiceRequest = require('../models/ServiceRequest');
const { sendSuccess, sendError } = require('../utils/response');
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * @desc    Create milestones for a service request
 * @route   POST /api/service-requests/:id/milestones
 * @access  Private (Admin/Vendor)
 */
const createMilestones = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { milestones } = req.body;

    // Validate service request ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid service request ID', 'INVALID_SERVICE_REQUEST_ID');
    }

    // Validate milestones array
    if (!Array.isArray(milestones) || milestones.length === 0) {
      return sendError(res, 400, 'Milestones array is required and must not be empty', 'INVALID_MILESTONES');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Validate that service request has a total price
    if (!serviceRequest.total_price || serviceRequest.total_price <= 0) {
      return sendError(res, 400, 'Service request must have a valid total price', 'INVALID_TOTAL_PRICE');
    }

    // Calculate total milestone amounts
    let totalMilestoneAmount = 0;
    const processedMilestones = milestones.map((milestone, index) => {
      // If percentage is provided, calculate amount from total price
      let amount = milestone.amount;
      if (milestone.percentage && milestone.percentage > 0) {
        amount = (serviceRequest.total_price * milestone.percentage) / 100;
      }

      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error(`Milestone ${index + 1}: Invalid amount or percentage`);
      }

      totalMilestoneAmount += amount;

      return {
        name: milestone.name,
        description: milestone.description || '',
        amount: parseFloat(amount.toFixed(2)),
        percentage: milestone.percentage || (amount / serviceRequest.total_price) * 100,
        order: milestone.order || index + 1,
        paymentStatus: 'Pending',
        completionStatus: 'NotStarted',
        dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
        isRequired: milestone.isRequired !== undefined ? milestone.isRequired : true,
        createdAt: new Date()
      };
    });

    // Validate that total milestone amount doesn't exceed total price
    if (totalMilestoneAmount > serviceRequest.total_price + 0.01) { // Allow 0.01 AED rounding error
      return sendError(
        res,
        400,
        `Total milestone amount (${totalMilestoneAmount.toFixed(2)} AED) exceeds total price (${serviceRequest.total_price} AED)`,
        'MILESTONE_AMOUNT_EXCEEDS_TOTAL'
      );
    }

    // Sort milestones by order
    processedMilestones.sort((a, b) => a.order - b.order);

    // Update service request
    serviceRequest.paymentType = 'milestone';
    serviceRequest.milestones = processedMilestones;
    serviceRequest.requireSequentialPayment = req.body.requireSequentialPayment !== undefined
      ? req.body.requireSequentialPayment
      : true;

    await serviceRequest.save();

    return sendSuccess(res, 201, 'Milestones created successfully', {
      serviceRequestId: serviceRequest._id.toString(),
      paymentType: serviceRequest.paymentType,
      requireSequentialPayment: serviceRequest.requireSequentialPayment,
      milestones: serviceRequest.milestones,
      totalMilestoneAmount: totalMilestoneAmount.toFixed(2),
      totalPrice: serviceRequest.total_price
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all milestones for a service request
 * @route   GET /api/service-requests/:id/milestones
 * @access  Public
 */
const getMilestones = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate service request ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid service request ID', 'INVALID_SERVICE_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    const milestonesData = {
      serviceRequestId: serviceRequest._id.toString(),
      paymentType: serviceRequest.paymentType,
      paymentMethod: serviceRequest.paymentMethod,
      totalPrice: serviceRequest.total_price,
      requireSequentialPayment: serviceRequest.requireSequentialPayment,
      milestones: serviceRequest.milestones || [],
      overallPaymentStatus: calculateOverallPaymentStatus(serviceRequest)
    };

    return sendSuccess(res, 200, 'Milestones retrieved successfully', milestonesData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a specific milestone
 * @route   PUT /api/service-requests/:id/milestones/:milestoneId
 * @access  Private (Admin/Vendor)
 */
const updateMilestone = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;
    const updates = req.body;

    // Validate service request ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid service request ID', 'INVALID_SERVICE_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Find the milestone
    const milestone = serviceRequest.milestones.id(milestoneId);
    if (!milestone) {
      return sendError(res, 404, 'Milestone not found', 'MILESTONE_NOT_FOUND');
    }

    // Update allowed fields (prevent updating payment-related fields directly)
    const allowedUpdates = ['name', 'description', 'dueDate', 'completionStatus', 'completedAt', 'isRequired'];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        milestone[field] = updates[field];
      }
    });

    // If completionStatus is set to Completed, set completedAt
    if (updates.completionStatus === 'Completed' && !milestone.completedAt) {
      milestone.completedAt = new Date();
    }

    await serviceRequest.save();

    return sendSuccess(res, 200, 'Milestone updated successfully', {
      serviceRequestId: serviceRequest._id.toString(),
      milestone: milestone
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a milestone
 * @route   DELETE /api/service-requests/:id/milestones/:milestoneId
 * @access  Private (Admin)
 */
const deleteMilestone = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;

    // Validate service request ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid service request ID', 'INVALID_SERVICE_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Find the milestone
    const milestone = serviceRequest.milestones.id(milestoneId);
    if (!milestone) {
      return sendError(res, 404, 'Milestone not found', 'MILESTONE_NOT_FOUND');
    }

    // Prevent deletion if milestone is already paid
    if (milestone.paymentStatus === 'Success') {
      return sendError(res, 400, 'Cannot delete a paid milestone', 'MILESTONE_ALREADY_PAID');
    }

    // Remove milestone
    milestone.deleteOne();
    await serviceRequest.save();

    return sendSuccess(res, 200, 'Milestone deleted successfully', {
      serviceRequestId: serviceRequest._id.toString(),
      deletedMilestoneId: milestoneId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate payment link for a specific milestone
 * @route   POST /api/service-requests/:id/milestones/:milestoneId/payment-link
 * @access  Private (Admin)
 */
const generateMilestonePaymentLink = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;
    const { expiryHours = 72 } = req.body; // Default 72 hours expiry

    // Validate service request ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid service request ID', 'INVALID_SERVICE_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Find the milestone
    const milestone = serviceRequest.milestones.id(milestoneId);
    if (!milestone) {
      return sendError(res, 404, 'Milestone not found', 'MILESTONE_NOT_FOUND');
    }

    // Check if milestone is already paid
    if (milestone.paymentStatus === 'Success') {
      return sendError(res, 400, 'Milestone is already paid', 'MILESTONE_ALREADY_PAID');
    }

    // Check if sequential payment is required and previous milestones are unpaid
    if (serviceRequest.requireSequentialPayment) {
      const previousMilestones = serviceRequest.milestones.filter(m => m.order < milestone.order);
      const unpaidPrevious = previousMilestones.find(m => m.paymentStatus !== 'Success');
      if (unpaidPrevious) {
        return sendError(
          res,
          400,
          `Previous milestone "${unpaidPrevious.name}" must be paid first`,
          'PREVIOUS_MILESTONE_UNPAID'
        );
      }
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Generate payment URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://zushh.com';
    const paymentUrl = `${frontendUrl}/pay-milestone/${token}`;

    // Update milestone payment link
    milestone.paymentLink = {
      token: token,
      url: paymentUrl,
      generatedBy: req.admin?._id || req.user?._id, // Assuming auth middleware adds admin/user
      generatedAt: new Date(),
      expiresAt: expiresAt,
      isExpired: false,
      isUsed: false
    };

    await serviceRequest.save();

    return sendSuccess(res, 201, 'Payment link generated successfully', {
      serviceRequestId: serviceRequest._id.toString(),
      milestoneId: milestone._id.toString(),
      milestoneName: milestone.name,
      amount: milestone.amount,
      paymentLink: paymentUrl,
      token: token,
      expiresAt: expiresAt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get milestone payment details by token (for payment page)
 * @route   GET /api/milestones/payment-link/:token
 * @access  Public
 */
const getMilestoneByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return sendError(res, 400, 'Payment token is required', 'MISSING_TOKEN');
    }

    // Find service request with matching milestone payment link token
    const serviceRequest = await ServiceRequest.findOne({
      'milestones.paymentLink.token': token
    });

    if (!serviceRequest) {
      return sendError(res, 404, 'Payment link not found', 'INVALID_TOKEN');
    }

    // Find the specific milestone
    const milestone = serviceRequest.milestones.find(m => m.paymentLink && m.paymentLink.token === token);

    if (!milestone) {
      return sendError(res, 404, 'Milestone not found', 'MILESTONE_NOT_FOUND');
    }

    // Check if payment link is expired
    if (milestone.paymentLink.isExpired || (milestone.paymentLink.expiresAt && new Date() > milestone.paymentLink.expiresAt)) {
      milestone.paymentLink.isExpired = true;
      await serviceRequest.save();
      return sendError(res, 410, 'Payment link has expired', 'LINK_EXPIRED');
    }

    // Check if milestone is already paid
    if (milestone.paymentStatus === 'Success') {
      return sendError(res, 400, 'Milestone is already paid', 'ALREADY_PAID');
    }

    // Check if sequential payment is required
    let canPay = true;
    let blockingMilestone = null;

    if (serviceRequest.requireSequentialPayment) {
      const previousMilestones = serviceRequest.milestones.filter(m => m.order < milestone.order);
      blockingMilestone = previousMilestones.find(m => m.paymentStatus !== 'Success');
      canPay = !blockingMilestone;
    }

    // Return milestone and service request details
    return sendSuccess(res, 200, 'Milestone payment details retrieved', {
      canPay: canPay,
      blockingMilestone: blockingMilestone ? {
        name: blockingMilestone.name,
        order: blockingMilestone.order,
        amount: blockingMilestone.amount
      } : null,
      serviceRequest: {
        _id: serviceRequest._id.toString(),
        service_name: serviceRequest.service_name,
        category_name: serviceRequest.category_name,
        user_name: serviceRequest.user_name,
        user_email: serviceRequest.user_email,
        user_phone: serviceRequest.user_phone,
        total_price: serviceRequest.total_price,
        paymentMethod: serviceRequest.paymentMethod,
        requireSequentialPayment: serviceRequest.requireSequentialPayment
      },
      milestone: {
        _id: milestone._id.toString(),
        name: milestone.name,
        description: milestone.description,
        amount: milestone.amount,
        percentage: milestone.percentage,
        order: milestone.order,
        paymentStatus: milestone.paymentStatus,
        dueDate: milestone.dueDate,
        expiresAt: milestone.paymentLink.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to calculate overall payment status
 */
const calculateOverallPaymentStatus = (serviceRequest) => {
  if (serviceRequest.paymentType !== 'milestone' || !serviceRequest.milestones || serviceRequest.milestones.length === 0) {
    return serviceRequest.paymentStatus;
  }

  const totalMilestones = serviceRequest.milestones.length;
  const paidMilestones = serviceRequest.milestones.filter(m => m.paymentStatus === 'Success').length;
  const failedMilestones = serviceRequest.milestones.filter(m => m.paymentStatus === 'Failure').length;

  if (paidMilestones === totalMilestones) {
    return 'Fully Paid';
  } else if (paidMilestones > 0) {
    return `Partially Paid (${paidMilestones}/${totalMilestones})`;
  } else if (failedMilestones > 0) {
    return 'Payment Failed';
  } else {
    return 'Pending';
  }
};

module.exports = {
  createMilestones,
  getMilestones,
  updateMilestone,
  deleteMilestone,
  generateMilestonePaymentLink,
  getMilestoneByToken
};

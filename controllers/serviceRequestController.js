const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');

// @desc    Create a new service request
// @route   POST /api/requests
// @access  User only
const createRequest = async (req, res, next) => {
  try {
    const { service, quantity, hours, address, scheduledDate, notes } = req.body;

    // Validate required fields
    if (!service || !address || !scheduledDate) {
      return sendError(res, 400, 'Service, address, and scheduledDate are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate scheduledDate is in the future
    const scheduledDateTime = new Date(scheduledDate);
    if (scheduledDateTime <= new Date()) {
      return sendError(res, 400, 'Scheduled date must be in the future', 'INVALID_SCHEDULED_DATE');
    }

    // Get the service to calculate total price
    const serviceData = await Service.findById(service);
    if (!serviceData) {
      return sendError(res, 404, 'Service not found', 'SERVICE_NOT_FOUND');
    }

    if (!serviceData.isActive) {
      return sendError(res, 400, 'Service is not available', 'SERVICE_INACTIVE');
    }

    // Calculate total price based on unit type
    let totalPrice;
    if (serviceData.unitType === 'per_unit') {
      totalPrice = serviceData.basePrice * (quantity || 1);
    } else if (serviceData.unitType === 'per_hour') {
      totalPrice = serviceData.basePrice * (hours || 1);
    }

    const requestData = {
      user: req.user.id,
      service,
      quantity: quantity || 1,
      hours: hours || 0,
      totalPrice,
      address,
      scheduledDate: scheduledDateTime,
      notes
    };

    const serviceRequest = await ServiceRequest.create(requestData);
    
    // Populate the service and user data for response
    await serviceRequest.populate([
      { path: 'service', select: 'name description basePrice unitType' },
      { path: 'user', select: 'name email' }
    ]);

    sendCreated(res, 'Service request created successfully', serviceRequest);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all service requests
// @route   GET /api/requests
// @access  Admin only
const getAllRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await ServiceRequest.find(filter)
      .populate('user', 'name email')
      .populate('service', 'name description basePrice unitType')
      .populate('vendor', 'firstName lastName email jobService')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ServiceRequest.countDocuments(filter);

    sendSuccess(res, 200, 'Service requests retrieved successfully', {
      requests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRequests: total,
        hasNext: skip + requests.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign a service request to a vendor
// @route   PATCH /api/requests/assign
// @access  Admin only
const assignRequest = async (req, res, next) => {
  try {
    const { requestId, vendorId } = req.body;

    if (!requestId || !vendorId) {
      return sendError(res, 400, 'Request ID and Vendor ID are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Check if request exists
    const serviceRequest = await ServiceRequest.findById(requestId);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'REQUEST_NOT_FOUND');
    }

    // Check if request is in pending status
    if (serviceRequest.status !== 'Pending') {
      return sendError(res, 400, 'Only pending requests can be assigned', 'INVALID_REQUEST_STATUS');
    }

    // Check if vendor exists and is approved
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendError(res, 404, 'Vendor not found', 'VENDOR_NOT_FOUND');
    }

    if (!vendor.approved) {
      return sendError(res, 400, 'Vendor is not approved', 'VENDOR_NOT_APPROVED');
    }

    // Update the request
    serviceRequest.vendor = vendorId;
    serviceRequest.status = 'Assigned';
    await serviceRequest.save();

    // Populate the updated request
    await serviceRequest.populate([
      { path: 'user', select: 'name email' },
      { path: 'service', select: 'name description basePrice unitType' },
      { path: 'vendor', select: 'firstName lastName email jobService' }
    ]);

    sendSuccess(res, 200, 'Service request assigned successfully', serviceRequest);
  } catch (error) {
    next(error);
  }
};

// @desc    Update service request status
// @route   PATCH /api/requests/:id/status
// @access  Vendor only
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 400, 'Status is required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate status
    const validStatuses = ['Pending', 'Assigned', 'InProgress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 400, 'Invalid status', 'INVALID_STATUS');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'REQUEST_NOT_FOUND');
    }

    // Check if vendor is assigned to this request
    if (!serviceRequest.vendor || serviceRequest.vendor.toString() !== req.user.id) {
      return sendError(res, 403, 'You are not assigned to this request', 'NOT_ASSIGNED_VENDOR');
    }

    // Validate status transitions
    const currentStatus = serviceRequest.status;
    const validTransitions = {
      'Assigned': ['InProgress', 'Cancelled'],
      'InProgress': ['Completed', 'Cancelled'],
      'Completed': [], // No further transitions
      'Cancelled': [], // No further transitions
      'Pending': [] // Should be handled by admin assignment
    };

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      return sendError(res, 400, `Cannot change status from ${currentStatus} to ${status}`, 'INVALID_STATUS_TRANSITION');
    }

    // Update the status
    serviceRequest.status = status;
    await serviceRequest.save();

    // Populate the updated request
    await serviceRequest.populate([
      { path: 'user', select: 'name email' },
      { path: 'service', select: 'name description basePrice unitType' },
      { path: 'vendor', select: 'firstName lastName email jobService' }
    ]);

    sendSuccess(res, 200, 'Service request status updated successfully', serviceRequest);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  getAllRequests,
  assignRequest,
  updateStatus
};

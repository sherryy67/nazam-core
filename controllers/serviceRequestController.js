const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const Category = require('../models/Category');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');

// @desc    Submit a service request
// @route   POST /api/submit-service-requests
// @access  Public (no authentication required)
const submitServiceRequest = async (req, res, next) => {
  try {
    const {
      user_name,
      user_phone,
      user_email,
      address,
      service_id,
      service_name,
      category_id,
      category_name,
      request_type,
      requested_date,
      message
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'user_name', 'user_phone', 'user_email', 'address',
      'service_id', 'service_name', 'category_id', 'category_name',
      'request_type', 'requested_date'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`, 'MISSING_REQUIRED_FIELDS');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return sendError(res, 400, 'Invalid email format', 'INVALID_EMAIL');
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(user_phone.replace(/[\s\-\(\)]/g, ''))) {
      return sendError(res, 400, 'Invalid phone number format', 'INVALID_PHONE');
    }

    // Validate request_type
    if (!['Quotation', 'OnTime', 'Scheduled'].includes(request_type)) {
      return sendError(res, 400, 'Invalid request_type. Must be Quotation, OnTime, or Scheduled', 'INVALID_REQUEST_TYPE');
    }

    // Validate service exists and is active
    const service = await Service.findById(service_id);
    if (!service || !service.isActive) {
      return sendError(res, 400, 'Invalid or inactive service', 'INVALID_SERVICE');
    }

    // Validate category exists and is active
    const category = await Category.findById(category_id);
    if (!category || !category.isActive) {
      return sendError(res, 400, 'Invalid or inactive category', 'INVALID_CATEGORY');
    }

    // Validate requested_date is not in the past
    const requestedDate = new Date(requested_date);
    const now = new Date();
    if (requestedDate < now) {
      return sendError(res, 400, 'Requested date cannot be in the past', 'INVALID_DATE');
    }

    // Create service request data
    const serviceRequestData = {
      user_name: user_name.trim(),
      user_phone: user_phone.trim(),
      user_email: user_email.trim().toLowerCase(),
      address: address.trim(),
      service_id,
      service_name: service_name.trim(),
      category_id,
      category_name: category_name.trim(),
      request_type,
      requested_date: requestedDate,
      message: message ? message.trim() : undefined,
      status: 'Pending'
    };

    // Create the service request
    const serviceRequest = await ServiceRequest.create(serviceRequestData);

    // Transform response to match frontend interface
    const transformedRequest = {
      _id: serviceRequest._id,
      user_name: serviceRequest.user_name,
      user_phone: serviceRequest.user_phone,
      user_email: serviceRequest.user_email,
      address: serviceRequest.address,
      service_id: serviceRequest.service_id,
      service_name: serviceRequest.service_name,
      category_id: serviceRequest.category_id,
      category_name: serviceRequest.category_name,
      request_type: serviceRequest.request_type,
      requested_date: serviceRequest.requested_date.toISOString(),
      message: serviceRequest.message,
      status: serviceRequest.status,
      createdAt: serviceRequest.createdAt.toISOString(),
      updatedAt: serviceRequest.updatedAt.toISOString()
    };

    const response = {
      success: true,
      exception: null,
      description: 'Service request submitted successfully',
      content: {
        serviceRequest: transformedRequest
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all service requests (Admin only)
// @route   GET /api/service-requests
// @access  Admin only
const getServiceRequests = async (req, res, next) => {
  try {
    const { status, request_type, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (request_type) query.request_type = request_type;

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute queries in parallel
    const [serviceRequests, totalCount] = await Promise.all([
      ServiceRequest.find(query)
        .populate('service_id', 'name description basePrice')
        .populate('category_id', 'name description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ServiceRequest.countDocuments(query)
    ]);

    // Transform service requests
    const transformedRequests = serviceRequests.map(request => ({
      _id: request._id,
      user_name: request.user_name,
      user_phone: request.user_phone,
      user_email: request.user_email,
      address: request.address,
      service_id: request.service_id,
      service_name: request.service_name,
      category_id: request.category_id,
      category_name: request.category_name,
      request_type: request.request_type,
      requested_date: request.requested_date.toISOString(),
      message: request.message,
      status: request.status,
      vendor: request.vendor,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString()
    }));

    const response = {
      success: true,
      exception: null,
      description: 'Service requests retrieved successfully',
      content: {
        serviceRequests: transformedRequests,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update service request status (Admin only)
// @route   PUT /api/service-requests/:id/status
// @access  Admin only
const updateServiceRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, vendor } = req.body;

    // Validate status
    if (!['Pending', 'Accepted', 'Completed', 'Cancelled'].includes(status)) {
      return sendError(res, 400, 'Invalid status. Must be Pending, Accepted, Completed, or Cancelled', 'INVALID_STATUS');
    }

    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Update service request
    const updateData = { status };
    if (vendor) updateData.vendor = vendor;

    const updatedRequest = await ServiceRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('service_id', 'name description')
     .populate('category_id', 'name description');

    // Transform response
    const transformedRequest = {
      _id: updatedRequest._id,
      user_name: updatedRequest.user_name,
      user_phone: updatedRequest.user_phone,
      user_email: updatedRequest.user_email,
      address: updatedRequest.address,
      service_id: updatedRequest.service_id,
      service_name: updatedRequest.service_name,
      category_id: updatedRequest.category_id,
      category_name: updatedRequest.category_name,
      request_type: updatedRequest.request_type,
      requested_date: updatedRequest.requested_date.toISOString(),
      message: updatedRequest.message,
      status: updatedRequest.status,
      vendor: updatedRequest.vendor,
      createdAt: updatedRequest.createdAt.toISOString(),
      updatedAt: updatedRequest.updatedAt.toISOString()
    };

    const response = {
      success: true,
      exception: null,
      description: 'Service request status updated successfully',
      content: {
        serviceRequest: transformedRequest
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus
};
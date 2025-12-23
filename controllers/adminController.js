const Service = require('../models/Service');
const Vendor = require('../models/Vendor');
const Category = require('../models/Category');
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const mongoose = require('mongoose');
const { sendSuccess, sendError, sendNotFoundError, sendValidationError } = require('../utils/response');
const { checkVendorEligibility } = require('../utils/vendorEligibility');
const emailService = require('../utils/emailService');

/**
 * @desc    Get eligible vendors for a specific service
 * @route   GET /api/admin/eligible-vendors/:serviceId
 * @access  Private (Admin only)
 */
const getEligibleVendors = async (req, res, next) => {
  try {
    const { serviceId } = req.params; // This can be either Service ID or ServiceRequest ID

    // Validate ID format
    if (!serviceId || !serviceId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid ID format', 'INVALID_ID_FORMAT');
    }

    // Try to find ServiceRequest first (user is likely passing serviceRequestId)
    const ServiceRequest = require('../models/ServiceRequest');
    let serviceRequest = await ServiceRequest.findById(serviceId);
    let service;
    
    if (serviceRequest) {
      // If it's a ServiceRequest, get the service from it
      service = await Service.findById(serviceRequest.service_id).populate('category_id', 'name description');
      if (!service) {
        return sendNotFoundError(res, 'Service not found for this request');
      }
    } else {
      // If not a ServiceRequest, treat it as a Service ID
      service = await Service.findById(serviceId).populate('category_id', 'name description');
      if (!service) {
        return sendNotFoundError(res, 'Service or Service Request not found');
      }
    }

    // Check if service is already assigned to a different vendor
    // This check is mainly informational - we allow getting eligible vendors even if service is assigned
    // The assignment will be handled by the assign endpoint
    // Removed the check here to allow viewing eligible vendors even for assigned services

    // Find all approved vendors with their primary service populated
    const vendors = await Vendor.find({ approved: true })
      .populate('serviceId', 'name description category_id')
      .select('-password'); // Exclude password from response

    // Filter eligible vendors
    const eligibleVendors = vendors.filter(vendor => {
      return checkVendorEligibility(vendor, service);
    });

    // Transform vendor data for response
    const transformedVendors = eligibleVendors.map(vendor => ({
      _id: vendor._id,
      type: vendor.type,
      company: vendor.company,
      firstName: vendor.firstName,
      lastName: vendor.lastName,
      fullName: `${vendor.firstName} ${vendor.lastName}`,
      email: vendor.email,
      mobileNumber: vendor.mobileNumber,
      coveredCity: vendor.coveredCity,
      primaryService: vendor.serviceId,
      availabilitySchedule: vendor.availabilitySchedule,
      privilege: vendor.privilege,
      experience: vendor.experience,
      profilePic: vendor.profilePic,
      createdAt: vendor.createdAt
    }));

    const responseData = {
      service: {
        _id: service._id,
        name: service.name,
        description: service.description,
        category: service.category_id,
        scheduledDate: service.scheduledDate,
        scheduledTime: service.scheduledTime,
        job_service_type: service.job_service_type
      },
      eligibleVendors: transformedVendors,
      totalEligibleVendors: transformedVendors.length
    };

    // Include service request info if it was passed
    if (serviceRequest) {
      responseData.serviceRequest = {
        _id: serviceRequest._id,
        service_id: serviceRequest.service_id,
        service_name: serviceRequest.service_name,
        requested_date: serviceRequest.requested_date,
        status: serviceRequest.status
      };
    }

    sendSuccess(res, 200, 'Eligible vendors retrieved successfully', responseData);

  } catch (error) {
    console.error('Error getting eligible vendors:', error);
    next(error);
  }
};

/**
 * @desc    Assign service to a vendor
 * @route   POST /api/admin/assign-service
 * @access  Private (Admin only)
 */
const assignServiceToVendor = async (req, res, next) => {
  try {
    const { vendorId, serviceId } = req.body;

    // Validate required fields
    if (!vendorId || !serviceId) {
      return sendError(res, 400, 'Vendor ID and Service ID are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate ObjectId format
    if (!vendorId.match(/^[0-9a-fA-F]{24}$/) || !serviceId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid ID format', 'INVALID_ID_FORMAT');
    }

    // Find vendor and service
    const [vendor, service] = await Promise.all([
      Vendor.findById(vendorId).populate('serviceId', 'name description category_id'),
      Service.findById(serviceId).populate('category_id', 'name description')
    ]);

    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    if (!service) {
      return sendNotFoundError(res, 'Service not found');
    }

    // Check if vendor is approved
    if (!vendor.approved) {
      return sendError(res, 400, 'Vendor is not approved', 'VENDOR_NOT_APPROVED');
    }

    // Check if service is already assigned to a different vendor
    // Allow reassignment to the same vendor or if vendorId is null/undefined
    if (service.isAssigned && service.vendorId && service.vendorId.toString() !== vendorId.toString()) {
      return sendError(res, 400, 'Service is already assigned to another vendor', 'SERVICE_ALREADY_ASSIGNED');
    }

    // Check vendor eligibility
    const isEligible = checkVendorEligibility(vendor, service);
    if (!isEligible) {
      return sendError(res, 400, 'Vendor is not eligible for this service', 'VENDOR_NOT_ELIGIBLE');
    }

    // Update service with vendor assignment
    // Clear assignedAt if reassigning to the same vendor, otherwise set new date
    const updateData = {
      vendorId: vendorId,
      isAssigned: true
    };
    
    // Only update assignedAt if this is a new assignment (different vendor)
    if (!service.vendorId || service.vendorId.toString() !== vendorId.toString()) {
      updateData.assignedAt = new Date();
    }
    
    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      updateData,
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email mobileNumber')
     .populate('category_id', 'name description');

    // Assign all pending ServiceRequests for this service to the vendor
    // and update their status from Pending to Assigned
    const ServiceRequest = require('../models/ServiceRequest');
    const updateResult = await ServiceRequest.updateMany(
      {
        service_id: serviceId,
        status: 'Pending'
      },
      {
        $set: {
          vendor: vendorId,
          status: 'Assigned'
        }
      }
    );

    // Send email notifications to customers whose requests were assigned
    try {
      const assignedRequests = await ServiceRequest.find({
        service_id: serviceId,
        status: 'Assigned',
        vendor: vendorId
      }).populate('service_id', 'name description');

      for (const request of assignedRequests) {
        if (request.user_email && emailService.isValidEmail(request.user_email)) {
          try {
            await emailService.sendServiceAssignedEmail(
              request.user_email,
              request.user_name,
              request,
              vendor
            );
          } catch (emailError) {
            console.error(`Failed to send assignment email to ${request.user_email}:`, emailError.message);
          }
        }
      }
    } catch (emailError) {
      // Log error but don't fail the assignment
      console.error('Failed to send assignment emails:', emailError.message);
    }

    // Note: We don't update vendor's serviceId since it's their primary service
    // The admin can assign multiple service requests to the same vendor
    // as long as they have different dates/times and the vendor is eligible

    sendSuccess(res, 200, 'Service assigned to vendor successfully', {
      service: {
        _id: updatedService._id,
        name: updatedService.name,
        description: updatedService.description,
        category: updatedService.category_id,
        vendor: updatedService.vendorId,
        scheduledDate: updatedService.scheduledDate,
        scheduledTime: updatedService.scheduledTime,
        isAssigned: updatedService.isAssigned,
        assignedAt: updatedService.assignedAt
      },
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        fullName: `${vendor.firstName} ${vendor.lastName}`,
        email: vendor.email,
        mobileNumber: vendor.mobileNumber,
        coveredCity: vendor.coveredCity
      }
    });

  } catch (error) {
    console.error('Error assigning service to vendor:', error);
    next(error);
  }
};

/**
 * @desc    Unassign service from vendor
 * @route   DELETE /api/admin/unassign-service/:serviceId
 * @access  Private (Admin only)
 */
const unassignServiceFromVendor = async (req, res, next) => {
  try {
    const { serviceId } = req.params;

    // Validate serviceId
    if (!serviceId || !serviceId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid service ID format', 'INVALID_SERVICE_ID');
    }

    // Find service
    const service = await Service.findById(serviceId).populate('vendorId', 'firstName lastName email');

    if (!service) {
      return sendNotFoundError(res, 'Service not found');
    }

    if (!service.isAssigned || !service.vendorId) {
      return sendError(res, 400, 'Service is not currently assigned to any vendor', 'SERVICE_NOT_ASSIGNED');
    }

    // Update service to remove assignment
    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      {
        vendorId: null,
        isAssigned: false,
        assignedAt: null
      },
      { new: true, runValidators: true }
    ).populate('category_id', 'name description');

    sendSuccess(res, 200, 'Service unassigned from vendor successfully', {
      service: {
        _id: updatedService._id,
        name: updatedService.name,
        description: updatedService.description,
        category: updatedService.category_id,
        isAssigned: updatedService.isAssigned,
        vendorId: updatedService.vendorId
      },
      previousVendor: {
        _id: service.vendorId._id,
        firstName: service.vendorId.firstName,
        lastName: service.vendorId.lastName,
        fullName: `${service.vendorId.firstName} ${service.vendorId.lastName}`,
        email: service.vendorId.email
      }
    });

  } catch (error) {
    console.error('Error unassigning service from vendor:', error);
    next(error);
  }
};

/**
 * @desc    Get all assigned services
 * @route   GET /api/admin/assigned-services
 * @access  Private (Admin only)
 */
const getAssignedServices = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, vendorId, categoryId } = req.query;

    // Build query
    const query = { isAssigned: true };
    
    if (vendorId) {
      query.vendorId = vendorId;
    }
    
    if (categoryId) {
      query.category_id = categoryId;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute queries in parallel
    const [services, totalCount] = await Promise.all([
      Service.find(query)
        .populate('vendorId', 'firstName lastName email mobileNumber coveredCity')
        .populate('category_id', 'name description')
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Service.countDocuments(query)
    ]);

    sendSuccess(res, 200, 'Assigned services retrieved successfully', {
      services,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalServices: totalCount,
        servicesPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error getting assigned services:', error);
    next(error);
  }
};

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // Execute all queries in parallel for better performance
    const [
      totalUsers,
      totalOrders,
      totalVendors,
      revenueResult,
      recentOrders
    ] = await Promise.all([
      // Total users count
      User.countDocuments(),
      
      // Total orders (service requests) count
      ServiceRequest.countDocuments(),
      
      // Total vendors count
      Vendor.countDocuments(),
      
      // Total revenue - sum of total_price from all completed orders
      ServiceRequest.aggregate([
        {
          $match: {
            status: 'Completed'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total_price' }
          }
        }
      ]),
      
      // Recent orders with their status
      ServiceRequest.find()
        .populate('service_id', 'name description')
        .populate('category_id', 'name description')
        .populate('vendor', 'firstName lastName email mobileNumber')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean()
    ]);

    // Extract total revenue from aggregation result
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Transform recent orders
    const transformedOrders = recentOrders.map(order => ({
      _id: order._id,
      user_name: order.user_name,
      user_phone: order.user_phone,
      user_email: order.user_email,
      address: order.address,
      service_id: order.service_id,
      service_name: order.service_name,
      category_id: order.category_id,
      category_name: order.category_name,
      request_type: order.request_type,
      requested_date: order.requested_date ? order.requested_date.toISOString() : null,
      message: order.message,
      status: order.status,
      vendor: order.vendor,
      unit_type: order.unit_type,
      unit_price: order.unit_price,
      number_of_units: order.number_of_units,
      total_price: order.total_price,
      createdAt: order.createdAt ? order.createdAt.toISOString() : null,
      updatedAt: order.updatedAt ? order.updatedAt.toISOString() : null
    }));

    // Get orders count by status
    const ordersByStatus = await ServiceRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Transform status counts into object
    const statusCounts = {};
    ordersByStatus.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    sendSuccess(res, 200, 'Dashboard data retrieved successfully', {
      statistics: {
        totalUsers,
        totalOrders,
        totalVendors,
        totalRevenue: totalRevenue || 0,
        ordersByStatus: {
          Pending: statusCounts.Pending || 0,
          Assigned: statusCounts.Assigned || 0,
          Accepted: statusCounts.Accepted || 0,
          Completed: statusCounts.Completed || 0,
          Cancelled: statusCounts.Cancelled || 0
        }
      },
      recentOrders: transformedOrders
    });
  } catch (error) {
    console.error('Error getting admin dashboard:', error);
    next(error);
  }
};

// @desc    Activate/Deactivate user
// @route   PATCH /api/admin/users/:userId/status
// @access  Admin only
const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'Invalid user ID', 'INVALID_USER_ID');
    }

    // Validate isActive field
    if (typeof isActive !== 'boolean') {
      return sendError(res, 400, 'isActive must be a boolean value', 'INVALID_STATUS');
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return sendNotFoundError(res, 'User not found');
    }

    // Update user status
    user.isActive = isActive;
    await user.save();

    // Transform user for response
    const transformedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      isOTPVerified: user.isOTPVerified,
      profilePic: user.profilePic || undefined,
      address: user.address || undefined,
      role: user.role,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString()
    };

    const message = isActive 
      ? 'User activated successfully' 
      : 'User deactivated successfully';

    return sendSuccess(res, 200, message, {
      user: transformedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin create user account (skips OTP verification)
// @route   POST /api/admin/users/create
// @access  Admin only
const adminCreateUser = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, password } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!name || (typeof name === 'string' && name.trim() === '')) missingFields.push('name');
    if (!email || (typeof email === 'string' && email.trim() === '')) missingFields.push('email');
    if (!phoneNumber || (typeof phoneNumber === 'string' && phoneNumber.trim() === '')) missingFields.push('phoneNumber');
    if (!password || (typeof password === 'string' && password.trim() === '')) missingFields.push('password');

    if (missingFields.length > 0) {
      return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`, 'MISSING_REQUIRED_FIELDS');
    }

    // Check if user already exists with this email or phone number
    const existingUser = await User.findOne({
      $or: [
        { email: email },
        { phoneNumber: phoneNumber }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return sendError(res, 409, 'A user with this email already exists', 'DUPLICATE_EMAIL');
      }
      return sendError(res, 409, 'A user with this phone number already exists', 'DUPLICATE_PHONE_NUMBER');
    }

    // Create user with OTP verification skipped (admin-created users are verified by default)
    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password,
      isOTPVerified: true, // Admin-created users skip OTP verification
      isActive: true
    };

    const user = await User.create(userData);

    // Remove password from response
    const userResponse = user.toJSON();

    return sendSuccess(res, 201, 'User created successfully by admin', {
      user: {
        _id: userResponse._id,
        name: userResponse.name,
        email: userResponse.email,
        phoneNumber: userResponse.phoneNumber,
        isActive: userResponse.isActive,
        isOTPVerified: userResponse.isOTPVerified,
        role: userResponse.role,
        createdAt: userResponse.createdAt?.toISOString(),
        updatedAt: userResponse.updatedAt?.toISOString()
      }
    });
  } catch (error) {
    // Handle specific database errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return sendError(res, 400, `Validation failed: ${validationErrors.join(', ')}`, 'VALIDATION_ERROR', { errors: validationErrors });
    }

    if (error.name === 'MongoServerError' || error.code === 11000) {
      // Duplicate key error
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      if (duplicateField === 'email') {
        return sendError(res, 409, 'A user with this email already exists', 'DUPLICATE_EMAIL');
      }
      if (duplicateField === 'phoneNumber') {
        return sendError(res, 409, 'A user with this phone number already exists', 'DUPLICATE_PHONE_NUMBER');
      }
      return sendError(res, 409, `A user with this ${duplicateField} already exists`, 'DUPLICATE_KEY_ERROR');
    }

    next(error);
  }
};

// @desc    Get all users with pagination and filters
// @route   GET /api/admin/users
// @access  Admin only
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    // Build query for filtering
    const query = {};
    
    // Filter by status: 'active' or 'deactive'
    if (status) {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'deactive' || status === 'deactivated') {
        query.isActive = false;
      }
    }

    // Search filter (combined with AND logic if status filter is present)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get statistics (always calculate regardless of filters)
    const [totalUsers, activeUsers, currentMonthUsers] = await Promise.all([
      User.countDocuments(), // Total users
      User.countDocuments({ isActive: true }), // Active users
      User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      }) // Current month users
    ]);

    // Get filtered users count
    const filteredTotal = await User.countDocuments(query);

    // Get users with filters
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Transform users
    const transformedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      isOTPVerified: user.isOTPVerified,
      profilePic: user.profilePic || undefined,
      address: user.address || undefined,
      role: user.role,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString()
    }));

    return sendSuccess(res, 200, 'Users retrieved successfully', {
      users: transformedUsers,
      statistics: {
        activeUsers,
        totalUsers,
        currentMonthUsers
      },
      pagination: {
        total: filteredTotal,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(filteredTotal / limitNum),
        hasNextPage: pageNum < Math.ceil(filteredTotal / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEligibleVendors,
  assignServiceToVendor,
  unassignServiceFromVendor,
  getAssignedServices,
  getAdminDashboard,
  toggleUserStatus,
  getAllUsers,
  adminCreateUser
};

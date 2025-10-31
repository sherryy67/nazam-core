const Service = require('../models/Service');
const Vendor = require('../models/Vendor');
const Category = require('../models/Category');
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const { sendSuccess, sendError, sendNotFoundError, sendValidationError } = require('../utils/response');
const { checkVendorEligibility } = require('../utils/vendorEligibility');

/**
 * @desc    Get eligible vendors for a specific service
 * @route   GET /api/admin/eligible-vendors/:serviceId
 * @access  Private (Admin only)
 */
const getEligibleVendors = async (req, res, next) => {
  try {
    const { serviceId } = req.params;

    // Validate serviceId
    if (!serviceId || !serviceId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid service ID format', 'INVALID_SERVICE_ID');
    }

    // Find service and populate category
    const service = await Service.findById(serviceId).populate('category_id', 'name description');
    
    if (!service) {
      return sendNotFoundError(res, 'Service not found');
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

    sendSuccess(res, 200, 'Eligible vendors retrieved successfully', {
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
    });

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

module.exports = {
  getEligibleVendors,
  assignServiceToVendor,
  unassignServiceFromVendor,
  getAssignedServices,
  getAdminDashboard
};

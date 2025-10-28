const Service = require('../models/Service');
const Vendor = require('../models/Vendor');
const Category = require('../models/Category');
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

    // Check if service is already assigned
    if (service.isAssigned && service.vendorId) {
      return sendError(res, 400, 'Service is already assigned to a vendor', 'SERVICE_ALREADY_ASSIGNED');
    }

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

    // Check if service is already assigned
    if (service.isAssigned && service.vendorId) {
      return sendError(res, 400, 'Service is already assigned to another vendor', 'SERVICE_ALREADY_ASSIGNED');
    }

    // Check vendor eligibility
    const isEligible = checkVendorEligibility(vendor, service);
    if (!isEligible) {
      return sendError(res, 400, 'Vendor is not eligible for this service', 'VENDOR_NOT_ELIGIBLE');
    }

    // Update service with vendor assignment
    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      {
        vendorId: vendorId,
        isAssigned: true,
        assignedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email mobileNumber')
     .populate('category_id', 'name description');

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

module.exports = {
  getEligibleVendors,
  assignServiceToVendor,
  unassignServiceFromVendor,
  getAssignedServices
};

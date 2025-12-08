const Vendor = require('../models/Vendor');
const Company = require('../models/Company');
const { sendSuccess, sendError, sendNotFoundError } = require('../utils/response');

/**
 * @desc    Update vendor availability schedule
 * @route   PUT /api/admin/vendor/:vendorId/availability
 * @access  Private (Admin only)
 */
const updateVendorAvailability = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { availabilitySchedule, unavailableDates } = req.body;

    // Validate vendorId
    if (!vendorId || !vendorId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid vendor ID format', 'INVALID_VENDOR_ID');
    }

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Validate availabilitySchedule if provided
    if (availabilitySchedule) {
      const validDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!Array.isArray(availabilitySchedule)) {
        return sendError(res, 400, 'availabilitySchedule must be an array', 'INVALID_AVAILABILITY_SCHEDULE');
      }
      
      for (const schedule of availabilitySchedule) {
        if (!schedule.dayOfWeek || !validDays.includes(schedule.dayOfWeek)) {
          return sendError(res, 400, 'Invalid dayOfWeek in availabilitySchedule', 'INVALID_DAY_OF_WEEK');
        }
        if (!schedule.startTime || !timePattern.test(schedule.startTime)) {
          return sendError(res, 400, 'Invalid startTime format in availabilitySchedule (use HH:MM)', 'INVALID_START_TIME');
        }
        if (!schedule.endTime || !timePattern.test(schedule.endTime)) {
          return sendError(res, 400, 'Invalid endTime format in availabilitySchedule (use HH:MM)', 'INVALID_END_TIME');
        }
      }
    }

    // Validate unavailableDates if provided
    if (unavailableDates) {
      if (!Array.isArray(unavailableDates)) {
        return sendError(res, 400, 'unavailableDates must be an array', 'INVALID_UNAVAILABLE_DATES');
      }
      
      for (const unavailable of unavailableDates) {
        if (!unavailable.date || isNaN(Date.parse(unavailable.date))) {
          return sendError(res, 400, 'Invalid date format in unavailableDates', 'INVALID_DATE_FORMAT');
        }
      }
    }

    // Update vendor
    const updateData = {};
    if (availabilitySchedule !== undefined) {
      updateData.availabilitySchedule = availabilitySchedule;
    }
    if (unavailableDates !== undefined) {
      updateData.unavailableDates = unavailableDates;
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    sendSuccess(res, 200, 'Vendor availability updated successfully', {
      vendor: {
        _id: updatedVendor._id,
        firstName: updatedVendor.firstName,
        lastName: updatedVendor.lastName,
        email: updatedVendor.email,
        availabilitySchedule: updatedVendor.availabilitySchedule,
        unavailableDates: updatedVendor.unavailableDates
      }
    });

  } catch (error) {
    console.error('Error updating vendor availability:', error);
    next(error);
  }
};

/**
 * @desc    Submit KYC documents for vendor
 * @route   PATCH /api/vendors/me/kyc
 * @access  Private (Vendor only)
 */
const submitVendorKYC = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;
    const {
      idDocumentFront,
      idDocumentBack,
      personalPhoto,
      additionalDocuments
    } = req.body;

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if vendor is approved and not blocked
    if (!vendor.approved || vendor.blocked) {
      return sendError(res, 403, 'Vendor account is not active', 'VENDOR_NOT_ACTIVE');
    }

    // Validate required documents
    if (!idDocumentFront) {
      return sendError(res, 400, 'ID document front is required', 'MISSING_ID_FRONT');
    }

    // Prepare KYC data
    const kycData = {
      idDocumentFront,
      kycStatus: 'pending',
      kycSubmittedAt: new Date()
    };

    if (idDocumentBack) kycData.idDocumentBack = idDocumentBack;
    if (personalPhoto) kycData.personalPhoto = personalPhoto;
    if (additionalDocuments && Array.isArray(additionalDocuments)) {
      kycData.additionalDocuments = additionalDocuments;
    }

    // Update vendor KYC info
    vendor.kycInfo = { ...vendor.kycInfo, ...kycData };
    await vendor.save();

    sendSuccess(res, 200, 'KYC documents submitted successfully', {
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        kycStatus: vendor.kycInfo.kycStatus,
        kycSubmittedAt: vendor.kycInfo.kycSubmittedAt
      }
    });

  } catch (error) {
    console.error('Error submitting vendor KYC:', error);
    next(error);
  }
};

/**
 * @desc    Admin verify vendor KYC
 * @route   PATCH /api/admin/vendors/:vendorId/kyc-verify
 * @access  Private (Admin only)
 */
const verifyVendorKYC = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { status, rejectionReason } = req.body;
    const adminId = req.admin.id;

    // Validate vendorId
    if (!vendorId || !vendorId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid vendor ID format', 'INVALID_VENDOR_ID');
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return sendError(res, 400, 'Invalid status. Must be approved or rejected', 'INVALID_STATUS');
    }

    // If rejecting, rejection reason is required
    if (status === 'rejected' && !rejectionReason) {
      return sendError(res, 400, 'Rejection reason is required when rejecting KYC', 'MISSING_REJECTION_REASON');
    }

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if KYC is pending
    if (vendor.kycInfo.kycStatus !== 'pending') {
      return sendError(res, 400, 'KYC is not in pending status', 'KYC_NOT_PENDING');
    }

    // Update KYC status
    vendor.kycInfo.kycStatus = status;
    vendor.kycInfo.kycVerifiedAt = new Date();
    vendor.kycInfo.kycVerifiedBy = adminId;

    if (status === 'rejected') {
      vendor.kycInfo.kycRejectionReason = rejectionReason;
    }

    await vendor.save();

    sendSuccess(res, 200, `Vendor KYC ${status} successfully`, {
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email,
        kycStatus: vendor.kycInfo.kycStatus,
        kycVerifiedAt: vendor.kycInfo.kycVerifiedAt,
        ...(status === 'rejected' && { kycRejectionReason: vendor.kycInfo.kycRejectionReason })
      }
    });

  } catch (error) {
    console.error('Error verifying vendor KYC:', error);
    next(error);
  }
};

/**
 * @desc    Get vendor KYC status
 * @route   GET /api/vendors/me/kyc
 * @access  Private (Vendor only)
 */
const getVendorKYCStatus = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;

    const vendor = await Vendor.findById(vendorId).select('kycInfo firstName lastName email');
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    sendSuccess(res, 200, 'KYC status retrieved successfully', {
      kycInfo: vendor.kycInfo
    });

  } catch (error) {
    console.error('Error getting vendor KYC status:', error);
    next(error);
  }
};

/**
 * @desc    Update vendor banking information
 * @route   PATCH /api/vendors/me/banking
 * @access  Private (Vendor only)
 */
const updateVendorBanking = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;
    const {
      bankName,
      branchName,
      bankAccountNumber,
      iban,
      vatRegistration,
      collectTax
    } = req.body;

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if vendor is approved and not blocked
    if (!vendor.approved || vendor.blocked) {
      return sendError(res, 403, 'Vendor account is not active', 'VENDOR_NOT_ACTIVE');
    }

    // Validate banking info
    if (!bankName || !branchName || !bankAccountNumber) {
      return sendError(res, 400, 'Bank name, branch name, and account number are required', 'MISSING_BANKING_INFO');
    }

    // Update banking info
    const bankingData = {
      bankName,
      branchName,
      bankAccountNumber,
      iban,
      vatRegistration: vatRegistration || false,
      collectTax: collectTax || false,
      bankingVerified: false // Reset verification when info is updated
    };

    vendor.bankingInfo = { ...vendor.bankingInfo, ...bankingData };
    await vendor.save();

    sendSuccess(res, 200, 'Banking information updated successfully', {
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        bankingInfo: {
          bankName: vendor.bankingInfo.bankName,
          bankingVerified: vendor.bankingInfo.bankingVerified
        }
      }
    });

  } catch (error) {
    console.error('Error updating vendor banking:', error);
    next(error);
  }
};

/**
 * @desc    Admin verify vendor banking information
 * @route   PATCH /api/admin/vendors/:vendorId/banking-verify
 * @access  Private (Admin only)
 */
const verifyVendorBanking = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const adminId = req.admin.id;

    // Validate vendorId
    if (!vendorId || !vendorId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid vendor ID format', 'INVALID_VENDOR_ID');
    }

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if banking info exists
    if (!vendor.bankingInfo.bankName) {
      return sendError(res, 400, 'Vendor has not submitted banking information', 'NO_BANKING_INFO');
    }

    // Verify banking info
    vendor.bankingInfo.bankingVerified = true;
    vendor.bankingInfo.verifiedAt = new Date();
    vendor.bankingInfo.verifiedBy = adminId;

    await vendor.save();

    sendSuccess(res, 200, 'Vendor banking information verified successfully', {
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email,
        bankingInfo: {
          bankName: vendor.bankingInfo.bankName,
          bankingVerified: vendor.bankingInfo.bankingVerified,
          verifiedAt: vendor.bankingInfo.verifiedAt
        }
      }
    });

  } catch (error) {
    console.error('Error verifying vendor banking:', error);
    next(error);
  }
};

/**
 * @desc    Get vendor banking status
 * @route   GET /api/vendors/me/banking
 * @access  Private (Vendor only)
 */
const getVendorBankingStatus = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;

    const vendor = await Vendor.findById(vendorId).select('bankingInfo firstName lastName email');
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    sendSuccess(res, 200, 'Banking status retrieved successfully', {
      bankingInfo: vendor.bankingInfo
    });

  } catch (error) {
    console.error('Error getting vendor banking status:', error);
    next(error);
  }
};

/**
 * @desc    Update vendor weekly availability schedule
 * @route   PATCH /api/vendors/me/availability/weekly
 * @access  Private (Vendor only)
 */
const updateVendorWeeklySchedule = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;
    const { availabilitySchedule } = req.body;

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if vendor is approved and not blocked
    if (!vendor.approved || vendor.blocked) {
      return sendError(res, 403, 'Vendor account is not active', 'VENDOR_NOT_ACTIVE');
    }

    // Validate availabilitySchedule if provided
    if (availabilitySchedule) {
      const validDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

      if (!Array.isArray(availabilitySchedule)) {
        return sendError(res, 400, 'availabilitySchedule must be an array', 'INVALID_AVAILABILITY_SCHEDULE');
      }

      for (const schedule of availabilitySchedule) {
        if (!schedule.dayOfWeek || !validDays.includes(schedule.dayOfWeek)) {
          return sendError(res, 400, 'Invalid dayOfWeek in availabilitySchedule', 'INVALID_DAY_OF_WEEK');
        }
        if (!schedule.startTime || !timePattern.test(schedule.startTime)) {
          return sendError(res, 400, 'Invalid startTime format in availabilitySchedule (use HH:MM)', 'INVALID_START_TIME');
        }
        if (!schedule.endTime || !timePattern.test(schedule.endTime)) {
          return sendError(res, 400, 'Invalid endTime format in availabilitySchedule (use HH:MM)', 'INVALID_END_TIME');
        }
      }
    }

    // Update availability schedule
    vendor.availabilitySchedule = availabilitySchedule || [];
    await vendor.save();

    sendSuccess(res, 200, 'Weekly availability schedule updated successfully', {
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        availabilitySchedule: vendor.availabilitySchedule
      }
    });

  } catch (error) {
    console.error('Error updating vendor weekly schedule:', error);
    next(error);
  }
};

/**
 * @desc    Block specific dates for vendor
 * @route   POST /api/vendors/me/availability/block-dates
 * @access  Private (Vendor only)
 */
const blockVendorDates = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;
    const { blockedDates } = req.body;

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if vendor is approved and not blocked
    if (!vendor.approved || vendor.blocked) {
      return sendError(res, 403, 'Vendor account is not active', 'VENDOR_NOT_ACTIVE');
    }

    // Validate blockedDates
    if (!Array.isArray(blockedDates)) {
      return sendError(res, 400, 'blockedDates must be an array', 'INVALID_BLOCKED_DATES');
    }

    for (const blockedDate of blockedDates) {
      if (!blockedDate.date || isNaN(Date.parse(blockedDate.date))) {
        return sendError(res, 400, 'Invalid date format in blockedDates', 'INVALID_DATE_FORMAT');
      }
    }

    // Add blocked dates (avoid duplicates)
    const existingDates = new Set(vendor.unavailableDates.map(d => d.date.toISOString().split('T')[0]));

    for (const blockedDate of blockedDates) {
      const dateStr = new Date(blockedDate.date).toISOString().split('T')[0];
      if (!existingDates.has(dateStr)) {
        vendor.unavailableDates.push({
          date: blockedDate.date,
          reason: blockedDate.reason || 'Blocked by vendor'
        });
      }
    }

    await vendor.save();

    sendSuccess(res, 200, 'Dates blocked successfully', {
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        unavailableDates: vendor.unavailableDates
      }
    });

  } catch (error) {
    console.error('Error blocking vendor dates:', error);
    next(error);
  }
};

/**
 * @desc    Get vendor availability information
 * @route   GET /api/vendors/me/availability
 * @access  Private (Vendor only)
 */
const getVendorAvailability = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;

    const vendor = await Vendor.findById(vendorId)
      .select('availabilitySchedule unavailableDates firstName lastName email');
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    sendSuccess(res, 200, 'Vendor availability retrieved successfully', {
      availability: {
        weeklySchedule: vendor.availabilitySchedule,
        blockedDates: vendor.unavailableDates
      }
    });

  } catch (error) {
    console.error('Error getting vendor availability:', error);
    next(error);
  }
};

/**
 * @desc    Get vendor profile
 * @route   GET /api/vendors/me
 * @access  Private (Vendor only)
 */
const getVendorProfile = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;

    const vendor = await Vendor.findById(vendorId)
      .populate('serviceId', 'name description basePrice unitType timeBasedPricing')
      .populate('companyId', 'companyName email')
      .select('-password');

    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    sendSuccess(res, 200, 'Vendor profile retrieved successfully', {
      vendor: vendor.toJSON()
    });

  } catch (error) {
    console.error('Error getting vendor profile:', error);
    next(error);
  }
};

/**
 * @desc    Update vendor profile
 * @route   PATCH /api/vendors/me
 * @access  Private (Vendor only)
 */
const updateVendorProfile = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;
    const allowedFields = [
      'firstName', 'lastName', 'coveredCity', 'gender', 'privilege',
      'profilePic', 'experience', 'address', 'country', 'city', 'pinCode',
      'serviceAvailability'
    ];

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if vendor is approved and not blocked
    if (!vendor.approved || vendor.blocked) {
      return sendError(res, 403, 'Vendor account is not active', 'VENDOR_NOT_ACTIVE');
    }

    // Update allowed fields
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Update vendor
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      updates,
      { new: true, runValidators: true }
    ).populate('serviceId', 'name description basePrice unitType timeBasedPricing')
     .populate('companyId', 'companyName email')
     .select('-password');

    sendSuccess(res, 200, 'Vendor profile updated successfully', {
      vendor: updatedVendor.toJSON()
    });

  } catch (error) {
    console.error('Error updating vendor profile:', error);
    next(error);
  }
};

/**
 * @desc    Update service request status by vendor
 * @route   PATCH /api/vendors/me/requests/:requestId/status
 * @access  Private (Vendor only)
 */
const updateVendorRequestStatus = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    const vendorId = req.vendor.id;

    // Validate requestId
    if (!requestId || !requestId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid request ID format', 'INVALID_REQUEST_ID');
    }

    // Validate status - vendors can only change from Assigned to Accepted, Completed, or Cancelled
    const allowedStatuses = ['Accepted', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return sendError(res, 400, `Invalid status. Vendor can only set status to: ${allowedStatuses.join(', ')}`, 'INVALID_STATUS');
    }

    // Find service request
    const ServiceRequest = require('../models/ServiceRequest');
    const serviceRequest = await ServiceRequest.findById(requestId)
      .populate('service_id', 'name description')
      .populate('vendor', 'firstName lastName email');

    if (!serviceRequest) {
      return sendNotFoundError(res, 'Service request not found');
    }

    // Check if vendor is assigned to this request
    if (!serviceRequest.vendor || serviceRequest.vendor._id.toString() !== vendorId) {
      return sendError(res, 403, 'You are not assigned to this service request', 'NOT_ASSIGNED_VENDOR');
    }

    // Check current status - vendor can only update if status is Assigned or Accepted
    if (!['Assigned', 'Accepted'].includes(serviceRequest.status)) {
      return sendError(res, 400, `Cannot update request with status: ${serviceRequest.status}`, 'INVALID_CURRENT_STATUS');
    }

    // Update request status
    serviceRequest.status = status;
    serviceRequest.updatedAt = new Date();
    await serviceRequest.save();

    sendSuccess(res, 200, 'Service request status updated successfully', {
      serviceRequest: {
        _id: serviceRequest._id,
        service_name: serviceRequest.service_name,
        status: serviceRequest.status,
        vendor: serviceRequest.vendor,
        updatedAt: serviceRequest.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating vendor request status:', error);
    next(error);
  }
};

/**
 * @desc    Get vendor's assigned service requests
 * @route   GET /api/vendors/me/requests
 * @access  Private (Vendor only)
 */
const getVendorRequests = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { vendor: vendorId };

    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get requests
    const ServiceRequest = require('../models/ServiceRequest');
    const [requests, totalCount] = await Promise.all([
      ServiceRequest.find(query)
        .populate('service_id', 'name description basePrice unitType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ServiceRequest.countDocuments(query)
    ]);

    sendSuccess(res, 200, 'Vendor service requests retrieved successfully', {
      requests,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalRequests: totalCount,
        requestsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error getting vendor requests:', error);
    next(error);
  }
};

/**
 * @desc    Deactivate vendor account (vendor-initiated)
 * @route   PATCH /api/vendors/me/deactivate
 * @access  Private (Vendor only)
 */
const deactivateVendorAccount = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return sendError(res, 400, 'Deactivation reason is required', 'MISSING_DEACTIVATION_REASON');
    }

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if already deactivated
    if (!vendor.active) {
      return sendError(res, 400, 'Vendor account is already deactivated', 'ALREADY_DEACTIVATED');
    }

    // Deactivate vendor
    await vendor.deactivateVendor(reason);

    sendSuccess(res, 200, 'Vendor account deactivated successfully', {
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        active: vendor.active,
        inactiveReason: vendor.inactiveReason,
        inactiveAt: vendor.inactiveAt
      }
    });

  } catch (error) {
    console.error('Error deactivating vendor account:', error);
    next(error);
  }
};

/**
 * @desc    Reactivate vendor account (vendor-initiated)
 * @route   PATCH /api/vendors/me/activate
 * @access  Private (Vendor only)
 */
const activateVendorAccount = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if already active
    if (vendor.active) {
      return sendError(res, 400, 'Vendor account is already active', 'ALREADY_ACTIVE');
    }

    // Check if vendor is approved and not blocked
    if (!vendor.approved) {
      return sendError(res, 403, 'Cannot reactivate: Vendor account is not approved', 'VENDOR_NOT_APPROVED');
    }

    if (vendor.blocked) {
      return sendError(res, 403, 'Cannot reactivate: Vendor account is blocked by admin', 'VENDOR_BLOCKED');
    }

    // Reactivate vendor
    await vendor.activateVendor();

    sendSuccess(res, 200, 'Vendor account reactivated successfully', {
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        active: vendor.active,
        inactiveReason: null,
        inactiveAt: null
      }
    });

  } catch (error) {
    console.error('Error activating vendor account:', error);
    next(error);
  }
};

module.exports = {
  updateVendorAvailability,
  submitVendorKYC,
  verifyVendorKYC,
  getVendorKYCStatus,
  updateVendorBanking,
  verifyVendorBanking,
  getVendorBankingStatus,
  updateVendorWeeklySchedule,
  blockVendorDates,
  getVendorAvailability,
  getVendorProfile,
  updateVendorProfile,
  updateVendorRequestStatus,
  getVendorRequests,
  deactivateVendorAccount,
  activateVendorAccount
};

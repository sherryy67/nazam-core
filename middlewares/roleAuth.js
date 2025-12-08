const { sendError } = require('../utils/response');
const ROLES = require('../constants/roles');

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Not authorized to access this route', 'NO_USER');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, `User role ${req.user.role} is not authorized to access this route`, 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  };
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === ROLES.ADMIN) {
    next();
  } else {
    return sendError(res, 403, 'Admin access required', 'ADMIN_REQUIRED');
  }
};

// Check if user is vendor
const isVendor = (req, res, next) => {
  if (req.user && req.user.role === ROLES.VENDOR) {
    next();
  } else {
    return sendError(res, 403, 'Vendor access required', 'VENDOR_REQUIRED');
  }
};

// Check if user is regular user
const isUser = (req, res, next) => {
  if (req.user && req.user.role === ROLES.USER) {
    next();
  } else {
    return sendError(res, 403, 'User access required', 'USER_REQUIRED');
  }
};

// Check if user is vendor or admin
const isVendorOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === ROLES.VENDOR || req.user.role === ROLES.ADMIN)) {
    next();
  } else {
    return sendError(res, 403, 'Vendor or Admin access required', 'VENDOR_OR_ADMIN_REQUIRED');
  }
};

// Check if user is company admin
const isCompanyAdmin = (req, res, next) => {
  if (req.user && req.user.role === ROLES.COMPANY_ADMIN) {
    next();
  } else {
    return sendError(res, 403, 'Company admin access required', 'COMPANY_ADMIN_REQUIRED');
  }
};

// Check if company is approved (for company-specific operations)
const isApprovedCompany = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return sendError(res, 403, 'Company admin access required', 'COMPANY_ADMIN_REQUIRED');
    }

    const Company = require('../models/Company');
    const company = await Company.findById(req.user.id);

    if (!company) {
      return sendError(res, 404, 'Company not found', 'COMPANY_NOT_FOUND');
    }

    if (!company.approved) {
      return sendError(res, 403, 'Company account not approved', 'COMPANY_NOT_APPROVED');
    }

    req.company = company;
    next();
  } catch (error) {
    return sendError(res, 500, 'Error checking company status', 'COMPANY_CHECK_ERROR');
  }
};

// Check if vendor is approved (for vendor-specific operations)
const isApprovedVendor = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.VENDOR) {
      return sendError(res, 403, 'Vendor access required', 'VENDOR_REQUIRED');
    }

    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(req.user.id);
    
    if (!vendor) {
      return sendError(res, 404, 'Vendor not found', 'VENDOR_NOT_FOUND');
    }

    if (!vendor.approved) {
      return sendError(res, 403, 'Vendor account not approved', 'VENDOR_NOT_APPROVED');
    }

    req.vendor = vendor;
    next();
  } catch (error) {
    return sendError(res, 500, 'Error checking vendor status', 'VENDOR_CHECK_ERROR');
  }
};

module.exports = {
  authorize,
  isAdmin,
  isVendor,
  isUser,
  isVendorOrAdmin,
  isApprovedVendor,
  isCompanyAdmin,
  isApprovedCompany
};

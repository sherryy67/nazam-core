const { sendError } = require('../utils/response');
const ROLES = require('../constants/roles');

// Grant access to specific roles (Super Admin always bypasses)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Not authorized to access this route', 'NO_USER');
    }

    // Super admin bypasses all role checks
    if (ROLES.isSuperAdmin(req.user.role)) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, `User role ${req.user.role} is not authorized to access this route`, 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  };
};

// Check if user is any staff member (role >= 3) — replaces old isAdmin for backward compat
const isAdmin = (req, res, next) => {
  if (req.user && ROLES.isStaffRole(req.user.role)) {
    next();
  } else {
    return sendError(res, 403, 'Admin access required', 'ADMIN_REQUIRED');
  }
};

// Alias for clarity in new code
const isStaff = (req, res, next) => {
  if (req.user && ROLES.isStaffRole(req.user.role)) {
    next();
  } else {
    return sendError(res, 403, 'Staff access required', 'STAFF_REQUIRED');
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

// Check if user is vendor or admin/staff
const isVendorOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === ROLES.VENDOR || ROLES.isStaffRole(req.user.role))) {
    next();
  } else {
    return sendError(res, 403, 'Vendor or Admin access required', 'VENDOR_OR_ADMIN_REQUIRED');
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

/**
 * Permission-based authorization middleware.
 * Checks if the staff user has ALL of the required permissions.
 * Super Admin (role 11) bypasses all permission checks.
 *
 * Usage: hasPermission('orders:read', 'users:read')
 */
const hasPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !ROLES.isStaffRole(req.user.role)) {
      return sendError(res, 403, 'Staff access required', 'STAFF_REQUIRED');
    }

    // Super admin bypasses all permission checks
    if (ROLES.isSuperAdmin(req.user.role)) {
      return next();
    }

    const userPermissions = req.user.permissions || [];

    const hasAll = requiredPermissions.every(perm => {
      return userPermissions.some(userPerm => {
        if (userPerm === '*') return true;
        if (userPerm.endsWith(':*')) {
          return perm.startsWith(userPerm.replace(':*', ':'));
        }
        return userPerm === perm;
      });
    });

    if (!hasAll) {
      return sendError(res, 403, 'Insufficient permissions', 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  };
};

module.exports = {
  authorize,
  isAdmin,
  isStaff,
  isVendor,
  isUser,
  isVendorOrAdmin,
  isApprovedVendor,
  hasPermission,
};

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Role = require('../models/Role');
const ROLES = require('../constants/roles');
const { sendError } = require('../utils/response');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return sendError(res, 401, 'Not authorized to access this route', 'NO_TOKEN');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from appropriate model based on role
    let user;
    if (decoded.role === ROLES.USER) {
      user = await User.findById(decoded.id);
      // Check if user is active (only for regular users)
      if (user && !user.isActive) {
        return sendError(res, 403, 'Your account is deactivated by admin please contact support', 'USER_DEACTIVATED');
      }
    } else if (decoded.role === ROLES.VENDOR) {
      user = await Vendor.findById(decoded.id);
    } else if (decoded.role === ROLES.PROPERTY_OWNER) {
      const PropertyOwner = require('../models/PropertyOwner');
      user = await PropertyOwner.findById(decoded.id);
      if (user && !user.isActive) {
        return sendError(res, 403, 'Your account is deactivated, please contact support', 'OWNER_DEACTIVATED');
      }
    } else if (decoded.role === ROLES.ORGANIZATION) {
      const Organization = require('../models/Organization');
      user = await Organization.findById(decoded.id);
      if (user && !user.isActive) {
        return sendError(res, 403, 'Your organization account is deactivated, please contact support', 'ORG_DEACTIVATED');
      }
    } else if (ROLES.isStaffRole(decoded.role)) {
      // Staff roles (3-11) — try Staff first, then legacy Admin fallback
      user = await Staff.findById(decoded.id);
      if (!user) {
        user = await Admin.findById(decoded.id);
      }
      if (user && user.isActive === false) {
        return sendError(res, 403, 'Your account is deactivated, please contact support', 'STAFF_DEACTIVATED');
      }
    }

    if (!user) {
      return sendError(res, 401, 'Not authorized, user not found', 'USER_NOT_FOUND');
    }

    // Add user info to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    // For staff users, resolve and attach permissions
    if (ROLES.isStaffRole(decoded.role)) {
      if (user.roleRef) {
        const roleDoc = await Role.findById(user.roleRef).lean();
        let perms = roleDoc ? roleDoc.permissions : [];

        // Apply per-user permission overrides
        if (user.permissionOverrides) {
          const revoked = user.permissionOverrides.revoke || [];
          const granted = user.permissionOverrides.grant || [];
          perms = perms.filter(p => !revoked.includes(p));
          perms = [...new Set([...perms, ...granted])];
        }

        req.user.permissions = perms;
        req.user.staffRole = roleDoc ? roleDoc.slug : null;
      } else {
        // Legacy Admin users (no roleRef) — grant full access
        req.user.permissions = ['*'];
        req.user.staffRole = 'admin';
      }
    }

    next();
  } catch (error) {
    return sendError(res, 401, 'Not authorized, token failed', 'INVALID_TOKEN');
  }
};

module.exports = { protect };

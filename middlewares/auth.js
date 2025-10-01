const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getRoleName } = require('../utils/roles');
const { sendAuthError, sendAuthzError } = require('../utils/response');

// Protect routes
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return sendAuthError(res, 'Not authorized, user not found');
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return sendAuthError(res, 'Not authorized, token failed');
    }
  }

  if (!token) {
    return sendAuthError(res, 'Not authorized, no token');
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendAuthzError(res, `User role ${getRoleName(req.user.role)} is not authorized to access this route`);
    }
    next();
  };
};

module.exports = { protect, authorize };

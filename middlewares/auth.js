const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
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
    if (decoded.role === 1) {
      user = await User.findById(decoded.id);
    } else if (decoded.role === 2) {
      user = await Vendor.findById(decoded.id);
    } else if (decoded.role === 3) {
      user = await Admin.findById(decoded.id);
    }

    if (!user) {
      return sendError(res, 401, 'Not authorized, user not found', 'USER_NOT_FOUND');
    }

    // Add user info to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    return sendError(res, 401, 'Not authorized, token failed', 'INVALID_TOKEN');
  }
};

module.exports = { protect };

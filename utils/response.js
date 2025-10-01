/**
 * Generic API Response Utility
 * Provides consistent response format across all API endpoints
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} description - Success message
 * @param {Object} content - Response data
 * @param {string} exception - Exception details (optional)
 */
const sendSuccess = (res, statusCode = 200, description = 'Operation successful', content = null, exception = null) => {
  return res.status(statusCode).json({
    success: true,
    exception: exception,
    description: description,
    content: content
  });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} description - Error message
 * @param {string} exception - Exception details
 * @param {Object} content - Additional error data (optional)
 */
const sendError = (res, statusCode = 400, description = 'Operation failed', exception = null, content = null) => {
  return res.status(statusCode).json({
    success: false,
    exception: exception,
    description: description,
    content: content
  });
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {string} description - Validation error message
 * @param {Array} errors - Validation errors array
 */
const sendValidationError = (res, description = 'Validation failed', errors = []) => {
  return res.status(400).json({
    success: false,
    exception: 'VALIDATION_ERROR',
    description: description,
    content: {
      errors: errors
    }
  });
};

/**
 * Send authentication error response
 * @param {Object} res - Express response object
 * @param {string} description - Authentication error message
 */
const sendAuthError = (res, description = 'Authentication failed') => {
  return res.status(401).json({
    success: false,
    exception: 'AUTHENTICATION_ERROR',
    description: description,
    content: null
  });
};

/**
 * Send authorization error response
 * @param {Object} res - Express response object
 * @param {string} description - Authorization error message
 */
const sendAuthzError = (res, description = 'Access denied') => {
  return res.status(403).json({
    success: false,
    exception: 'AUTHORIZATION_ERROR',
    description: description,
    content: null
  });
};

/**
 * Send not found error response
 * @param {Object} res - Express response object
 * @param {string} description - Not found error message
 */
const sendNotFoundError = (res, description = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    exception: 'NOT_FOUND',
    description: description,
    content: null
  });
};

/**
 * Send server error response
 * @param {Object} res - Express response object
 * @param {string} description - Server error message
 * @param {string} exception - Exception details
 */
const sendServerError = (res, description = 'Internal server error', exception = 'INTERNAL_SERVER_ERROR') => {
  return res.status(500).json({
    success: false,
    exception: exception,
    description: description,
    content: null
  });
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {string} description - Success message
 * @param {Object} content - Created resource data
 */
const sendCreated = (res, description = 'Resource created successfully', content = null) => {
  return sendSuccess(res, 201, description, content);
};

/**
 * Send no content response (204)
 * @param {Object} res - Express response object
 */
const sendNoContent = (res) => {
  return res.status(204).json({
    success: true,
    exception: null,
    description: 'No content',
    content: null
  });
};

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  sendAuthError,
  sendAuthzError,
  sendNotFoundError,
  sendServerError,
  sendCreated,
  sendNoContent
};

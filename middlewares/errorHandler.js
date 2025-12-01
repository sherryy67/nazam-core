const { sendError, sendServerError } = require("../utils/response");

const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 413, 'File size exceeds 100MB limit', 'FILE_TOO_LARGE', {
        message: 'File size must be less than 100MB',
        maxSize: '100MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return sendError(res, 400, 'Too many files uploaded', 'TOO_MANY_FILES');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return sendError(res, 400, 'Unexpected file field', 'UNEXPECTED_FILE_FIELD');
    }
    if (err.code === 'LIMIT_PART_COUNT') {
      return sendError(res, 413, 'Too many parts in the multipart request', 'TOO_MANY_PARTS');
    }
    if (err.code === 'LIMIT_FIELD_KEY') {
      return sendError(res, 413, 'Field name too long', 'FIELD_NAME_TOO_LONG');
    }
    if (err.code === 'LIMIT_FIELD_VALUE') {
      return sendError(res, 413, 'Field value too long', 'FIELD_VALUE_TOO_LONG');
    }
    if (err.code === 'LIMIT_FIELD_COUNT') {
      return sendError(res, 413, 'Too many fields', 'TOO_MANY_FIELDS');
    }
    return sendError(res, 400, `Upload error: ${err.message}`, 'UPLOAD_ERROR');
  }

  // Handle "entity too large" errors (typically from body parser or reverse proxy)
  if (err.message && (err.message.includes('entity too large') || err.message.includes('request entity too large') || err.status === 413)) {
    return sendError(res, 413, 'Request entity too large. Maximum file size is 100MB', 'ENTITY_TOO_LARGE', {
      message: 'The uploaded file exceeds the maximum allowed size',
      maxSize: '100MB'
    });
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    return sendError(res, 404, "Resource not found", "RESOURCE_NOT_FOUND");
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return sendError(
      res,
      400,
      "an account with this email already exists",
      "DUPLICATE_ENTRY"
    );
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((val) => val.message);
    return sendError(res, 400, "Validation failed", "VALIDATION_ERROR", {
      errors,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(res, 401, "Invalid token", "INVALID_TOKEN");
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, 401, "Token expired", "TOKEN_EXPIRED");
  }

  // Default server error
  sendServerError(
    res,
    error.message || "Server Error",
    "INTERNAL_SERVER_ERROR"
  );
};

module.exports = errorHandler;

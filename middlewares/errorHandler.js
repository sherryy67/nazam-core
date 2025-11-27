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
      return sendError(res, 400, 'File size exceeds 10MB limit', 'FILE_TOO_LARGE', {
        message: 'File size must be less than 10MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return sendError(res, 400, 'Too many files uploaded', 'TOO_MANY_FILES');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return sendError(res, 400, 'Unexpected file field', 'UNEXPECTED_FILE_FIELD');
    }
    return sendError(res, 400, `Upload error: ${err.message}`, 'UPLOAD_ERROR');
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

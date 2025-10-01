const { sendError, sendServerError } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

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

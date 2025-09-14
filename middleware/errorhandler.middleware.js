import { ApiResponse } from "../lib/api-response.js";
import { AppError } from "../lib/api-error.js";

export const errorHandler = (err, req, res, next) => {
  // Default values for unexpected errors
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  err.message = err.message || "Something went wrong!";

  // Log error with metadata if available
  const logData = {
    status: err.status,
    message: err.message,
  };

  if (process.env.NODE_ENV === "development") {
    logData.stack = err.stack;
    if (err.metadata) logData.metadata = err.metadata;
    req.logger?.error("ERROR", logData);
  } else if (process.env.NODE_ENV === "production") {
    if (err.metadata) logData.metadata = err.metadata;
    req.logger?.error("ERROR", logData);
  }

  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    err = new AppError(message, 400, { field: Object.keys(err.keyValue)[0] });
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    const message = "Validation failed";
    err = new AppError(message, 400, { validationErrors: errors });
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    err = new AppError("Invalid token. Please log in again!", 401, {
      code: "INVALID_TOKEN",
    });
  }

  if (err.name === "TokenExpiredError") {
    err = new AppError("Your token has expired! Please log in again.", 401, {
      code: "TOKEN_EXPIRED",
    });
  }

  // Build extra response data (stack trace, metadata)
  const responseData = {};
  if (process.env.NODE_ENV === "development") {
    responseData.stack = err.stack;
  }
  if (err.metadata) {
    responseData.metadata = err.metadata;
  }

  const errorResponse = ApiResponse.error(
    err.message,
    err.statusCode,
    Object.keys(responseData).length > 0 ? responseData : undefined
  );

  res.status(err.statusCode).json(errorResponse.toJSON());
};

export const notFoundHandler = (req, res, next) => {
  next(
    new AppError(`Can't find ${req.originalUrl} on this server!`, 404, {
      path: req.originalUrl,
      method: req.method,
    })
  );
};

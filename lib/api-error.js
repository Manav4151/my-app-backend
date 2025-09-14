export class AppError extends Error {
  constructor(message, statusCode = 500, metadata) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, metadata) {
    return new AppError(message, 400, metadata);
  }

  static unauthorized(message = "Unauthorized", metadata) {
    return new AppError(message, 401, metadata);
  }

  static forbidden(message = "Forbidden", metadata) {
    return new AppError(message, 403, metadata);
  }

  static notFound(message = "Not Found", metadata) {
    return new AppError(message, 404, metadata);
  }

  static conflict(message, metadata) {
    return new AppError(message, 409, metadata);
  }

  static internal(message = "Internal Server Error", metadata) {
    return new AppError(message, 500, metadata);
  }
}

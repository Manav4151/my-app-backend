/**
 * Standardized API response format
 */
export class ApiResponse {
  /**
   * Creates a new ApiResponse instance
   * @param {number} statusCode - HTTP status code
   * @param {any} data - Response data (can be null for error responses)
   * @param {string} message - Optional message (defaults to 'Success' or 'Error')
   */
  constructor(
    statusCode,
    data = null,
    message = statusCode < 400 ? "Success" : "Error"
  ) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Creates a success response
   * @param {any} data - Response data
   * @param {string} message - Optional success message
   * @returns {ApiResponse}
   */
  static success(data, message = "Success") {
    return new ApiResponse(200, data, message);
  }

  /**
   * Creates an error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP error status code (default: 500)
   * @param {any} data - Optional error details
   * @returns {ApiResponse}
   */
  static error(
    message = "Internal Server Error",
    statusCode = 500,
    data = null
  ) {
    return new ApiResponse(statusCode, data, message);
  }

  /**
   * Creates a not found response
   * @param {string} message - Optional not found message
   * @returns {ApiResponse}
   */
  static notFound(message = "Resource not found") {
    return new ApiResponse(404, null, message);
  }

  /**
   * Creates an unauthorized response
   * @param {string} message - Optional unauthorized message
   * @returns {ApiResponse}
   */
  static unauthorized(message = "Unauthorized") {
    return new ApiResponse(401, null, message);
  }

  /**
   * Creates a forbidden response
   * @param {string} message - Optional forbidden message
   * @returns {ApiResponse}
   */
  static forbidden(message = "Forbidden") {
    return new ApiResponse(403, null, message);
  }

  /**
   * Converts the response to a plain object
   * @returns {object}
   */
  toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
    };
  }
}


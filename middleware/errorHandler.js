/**
 * Centralized error handling middleware for the Task Manager API
 * Maps MongoDB errors to appropriate HTTP status codes and formats responses
 */

const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal server error'
  };

  // MongoDB Validation Error (e.g., required field missing, invalid enum value)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map(e => e.message);
    errorResponse = {
      error: 'Validation failed',
      details: messages
    };
  }
  // MongoDB CastError (e.g., invalid ObjectId format)
  else if (err.name === 'CastError') {
    statusCode = 400;
    errorResponse = {
      error: 'Invalid ID format'
    };
  }
  // MongoDB Duplicate Key Error
  else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    errorResponse = {
      error: `Duplicate value for field: ${field}`
    };
  }
  // MongoDB Network Error
  else if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    statusCode = 503;
    errorResponse = {
      error: 'Service temporarily unavailable'
    };
  }
  // Custom error with statusCode property
  else if (err.statusCode) {
    statusCode = err.statusCode;
    errorResponse = {
      error: err.message
    };
  }
  // Generic error
  else if (err.message) {
    errorResponse = {
      error: err.message
    };
  }

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;

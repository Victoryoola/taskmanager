/**
 * Validation middleware for the Task Manager API
 * Provides input validation and sanitization for request parameters and body
 */

const mongoose = require('mongoose');

/**
 * Validates that the request parameter 'id' is a valid MongoDB ObjectId
 * Returns 400 error if invalid
 */
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: 'Invalid task ID format'
    });
  }
  
  next();
};

/**
 * Sanitizes a string to prevent injection attacks
 * Removes potential XSS and NoSQL injection payloads
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remove HTML tags and script content
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]+>/g, '');
  
  // Remove MongoDB operators from strings
  sanitized = sanitized.replace(/\$\w+/g, '');
  
  return sanitized;
};

/**
 * Sanitizes an object recursively
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Remove keys that start with $ (MongoDB operators)
      if (key.startsWith('$')) {
        continue;
      }
      
      if (typeof obj[key] === 'string') {
        sanitized[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
  }
  
  return sanitized;
};

/**
 * Validates task input for creation
 * Checks required fields and validates field types
 */
const validateTaskInput = (req, res, next) => {
  const errors = [];
  
  // Sanitize request body
  req.body = sanitizeObject(req.body);
  
  const { title, status, description } = req.body;
  
  // Validate title (required, non-empty)
  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.push('Title is required and must be a non-empty string');
  }
  
  // Validate status (optional, but must be valid enum if provided)
  if (status !== undefined) {
    if (typeof status !== 'string' || !['pending', 'completed'].includes(status)) {
      errors.push("Status must be either 'pending' or 'completed'");
    }
  }
  
  // Validate description (optional, but must be string if provided)
  if (description !== undefined && typeof description !== 'string') {
    errors.push('Description must be a string');
  }
  
  // Return errors if any
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

/**
 * Validates task update input
 * Ensures at least one valid field is provided and validates field types
 */
const validateTaskUpdate = (req, res, next) => {
  const errors = [];
  
  // Sanitize request body
  req.body = sanitizeObject(req.body);
  
  const { title, status, description } = req.body;
  const validFields = ['title', 'status', 'description'];
  const providedFields = Object.keys(req.body);
  
  // Check if at least one valid field is provided
  const hasValidField = providedFields.some(field => validFields.includes(field));
  
  if (!hasValidField || providedFields.length === 0) {
    errors.push('At least one valid field (title, status, or description) must be provided');
  }
  
  // Validate title if provided
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      errors.push('Title must be a non-empty string');
    }
  }
  
  // Validate status if provided
  if (status !== undefined) {
    if (typeof status !== 'string' || !['pending', 'completed'].includes(status)) {
      errors.push("Status must be either 'pending' or 'completed'");
    }
  }
  
  // Validate description if provided
  if (description !== undefined && typeof description !== 'string') {
    errors.push('Description must be a string');
  }
  
  // Return errors if any
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

module.exports = {
  validateObjectId,
  validateTaskInput,
  validateTaskUpdate
};

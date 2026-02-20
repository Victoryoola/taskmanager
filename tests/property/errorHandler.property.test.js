/**
 * Property-Based Tests for Error Handler Middleware
 * Feature: api-error-handling
 * 
 * These tests verify universal properties that should hold across all error scenarios
 */

const fc = require('fast-check');
const errorHandler = require('../../middleware/errorHandler');

describe('Error Handler Property Tests', () => {
  
  // Property 1: Error Handler Catches All Endpoint Errors
  // Validates: Requirements 1.2, 1.3
  describe('Property 1: Error Handler Catches All Endpoint Errors', () => {
    test('should catch any error and return JSON response with error field and status code', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 400, max: 599 }),
          (errorMessage, statusCode) => {
            // Create mock error
            const err = new Error(errorMessage);
            err.statusCode = statusCode;
            
            // Create mock request, response, and next
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            // Call error handler
            errorHandler(err, req, res, next);
            
            // Verify response
            expect(res.status).toHaveBeenCalledWith(statusCode);
            expect(res.json).toHaveBeenCalled();
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toHaveProperty('error');
            expect(typeof jsonResponse.error).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 2: MongoDB Errors Map to Correct Status Codes
  // Validates: Requirements 1.4
  describe('Property 2: MongoDB Errors Map to Correct Status Codes', () => {
    test('ValidationError should map to 400', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (fieldName) => {
            const err = new Error('Validation failed');
            err.name = 'ValidationError';
            err.errors = {
              [fieldName]: { message: `${fieldName} is required` }
            };
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            errorHandler(err, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toHaveProperty('error');
            expect(jsonResponse).toHaveProperty('details');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('CastError should map to 400', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (value) => {
            const err = new Error('Cast failed');
            err.name = 'CastError';
            err.value = value;
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            errorHandler(err, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Invalid ID format');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('MongoNetworkError should map to 503', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            const err = new Error(errorMessage);
            err.name = 'MongoNetworkError';
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            errorHandler(err, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(503);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Service temporarily unavailable');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('MongoTimeoutError should map to 503', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            const err = new Error(errorMessage);
            err.name = 'MongoTimeoutError';
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            errorHandler(err, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(503);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Service temporarily unavailable');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Duplicate key error (code 11000) should map to 400', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (fieldName) => {
            const err = new Error('Duplicate key');
            err.code = 11000;
            err.keyPattern = { [fieldName]: 1 };
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            errorHandler(err, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toContain('Duplicate value');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Unknown errors should map to 500', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            const err = new Error(errorMessage);
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            errorHandler(err, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(500);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toHaveProperty('error');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 10: All Errors Logged
  // Validates: Requirements 4.4
  describe('Property 10: All Errors Logged', () => {
    test('should log error message for any error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            const err = new Error(errorMessage);
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            // Spy on console.error
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            errorHandler(err, req, res, next);
            
            // Verify error was logged
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', errorMessage);
            
            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 13: All Error Responses Are JSON
  // Validates: Requirements 7.1, 7.2
  describe('Property 13: All Error Responses Are JSON', () => {
    test('should return JSON response with error field for any error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.oneof(
            fc.constant('ValidationError'),
            fc.constant('CastError'),
            fc.constant('MongoNetworkError'),
            fc.constant('Error')
          ),
          (errorMessage, errorType) => {
            const err = new Error(errorMessage);
            err.name = errorType;
            
            if (errorType === 'ValidationError') {
              err.errors = { field: { message: 'Field error' } };
            }
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            errorHandler(err, req, res, next);
            
            // Verify JSON response was called
            expect(res.json).toHaveBeenCalled();
            const jsonResponse = res.json.mock.calls[0][0];
            
            // Verify response is a valid object with error field
            expect(typeof jsonResponse).toBe('object');
            expect(jsonResponse).toHaveProperty('error');
            expect(typeof jsonResponse.error).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 15: Production Mode Hides Stack Traces
  // Validates: Requirements 7.4
  describe('Property 15: Production Mode Hides Stack Traces', () => {
    test('should not include stack trace when NODE_ENV is production', () => {
      const originalEnv = process.env.NODE_ENV;
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            process.env.NODE_ENV = 'production';
            
            const err = new Error(errorMessage);
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            // Spy on console.error to suppress output
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            errorHandler(err, req, res, next);
            
            const jsonResponse = res.json.mock.calls[0][0];
            
            // Verify stack trace is NOT included
            expect(jsonResponse).not.toHaveProperty('stack');
            
            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  // Property 16: Development Mode Includes Stack Traces
  // Validates: Requirements 7.5
  describe('Property 16: Development Mode Includes Stack Traces', () => {
    test('should include stack trace when NODE_ENV is development', () => {
      const originalEnv = process.env.NODE_ENV;
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            process.env.NODE_ENV = 'development';
            
            const err = new Error(errorMessage);
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            // Spy on console.error to suppress output
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            errorHandler(err, req, res, next);
            
            const jsonResponse = res.json.mock.calls[0][0];
            
            // Verify stack trace IS included
            expect(jsonResponse).toHaveProperty('stack');
            expect(typeof jsonResponse.stack).toBe('string');
            
            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});

  // Property 9: Database Errors Handled Gracefully
  // Validates: Requirements 4.2, 6.2, 6.3
  describe('Property 9: Database Errors Handled Gracefully', () => {
    test('should handle database connection errors with 503 status', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            const err = new Error(errorMessage);
            err.name = 'MongoNetworkError';
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            // Spy on console.error to suppress output
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            errorHandler(err, req, res, next);
            
            // Verify 503 status code for connection issues
            expect(res.status).toHaveBeenCalledWith(503);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Service temporarily unavailable');
            
            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle database timeout errors with 503 status', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            const err = new Error(errorMessage);
            err.name = 'MongoTimeoutError';
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            // Spy on console.error to suppress output
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            errorHandler(err, req, res, next);
            
            // Verify 503 status code for timeout issues
            expect(res.status).toHaveBeenCalledWith(503);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Service temporarily unavailable');
            
            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle other database errors with 500 status', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            const err = new Error(errorMessage);
            err.name = 'MongoServerError';
            
            const req = {};
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            // Spy on console.error to suppress output
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            errorHandler(err, req, res, next);
            
            // Verify 500 status code for other database errors
            expect(res.status).toHaveBeenCalledWith(500);
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse).toHaveProperty('error');
            
            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });
  });


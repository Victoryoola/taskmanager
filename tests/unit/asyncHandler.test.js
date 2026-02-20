/**
 * Unit Tests for Async Handler Wrapper Middleware
 * Feature: api-error-handling
 * 
 * Tests that async errors are caught and passed to error handler
 * Validates: Requirements 4.1, 4.2
 */

const asyncHandler = require('../../middleware/asyncHandler');

describe('Async Handler Middleware', () => {
  
  test('should catch async errors and pass to next()', async () => {
    // Create an async function that throws an error
    const error = new Error('Async operation failed');
    const asyncFn = async (req, res, next) => {
      throw error;
    };
    
    // Wrap with asyncHandler
    const wrappedFn = asyncHandler(asyncFn);
    
    // Create mock request, response, and next
    const req = {};
    const res = {};
    const next = jest.fn();
    
    // Call the wrapped function
    await wrappedFn(req, res, next);
    
    // Verify next was called with the error
    expect(next).toHaveBeenCalledWith(error);
  });

  test('should catch rejected promises and pass to next()', async () => {
    // Create an async function that returns a rejected promise
    const error = new Error('Promise rejected');
    const asyncFn = async (req, res, next) => {
      throw error;
    };
    
    // Wrap with asyncHandler
    const wrappedFn = asyncHandler(asyncFn);
    
    // Create mock request, response, and next
    const req = {};
    const res = {};
    const next = jest.fn();
    
    // Call the wrapped function and wait for promise to settle
    const result = wrappedFn(req, res, next);
    
    // Wait for the promise to complete
    await new Promise(resolve => setImmediate(resolve));
    
    // Verify next was called with the error
    expect(next).toHaveBeenCalledWith(error);
  });

  test('should allow successful async operations to proceed normally', async () => {
    // Create a successful async function
    const asyncFn = async (req, res, next) => {
      res.status(200).json({ success: true });
    };
    
    // Wrap with asyncHandler
    const wrappedFn = asyncHandler(asyncFn);
    
    // Create mock request, response, and next
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();
    
    // Call the wrapped function
    await wrappedFn(req, res, next);
    
    // Verify response was sent successfully
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    
    // Verify next was NOT called with an error
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle database operation errors', async () => {
    // Simulate a database error
    const dbError = new Error('Database connection failed');
    dbError.name = 'MongoNetworkError';
    
    const asyncFn = async (req, res, next) => {
      // Simulate database operation
      throw dbError;
    };
    
    // Wrap with asyncHandler
    const wrappedFn = asyncHandler(asyncFn);
    
    // Create mock request, response, and next
    const req = {};
    const res = {};
    const next = jest.fn();
    
    // Call the wrapped function
    await wrappedFn(req, res, next);
    
    // Verify next was called with the database error
    expect(next).toHaveBeenCalledWith(dbError);
    expect(next.mock.calls[0][0].name).toBe('MongoNetworkError');
  });

  test('should handle synchronous errors thrown in async functions', async () => {
    // Create an async function that throws synchronously
    const error = new Error('Synchronous error in async function');
    const asyncFn = async (req, res, next) => {
      throw error;
    };
    
    // Wrap with asyncHandler
    const wrappedFn = asyncHandler(asyncFn);
    
    // Create mock request, response, and next
    const req = {};
    const res = {};
    const next = jest.fn();
    
    // Call the wrapped function
    await wrappedFn(req, res, next);
    
    // Verify next was called with the error
    expect(next).toHaveBeenCalledWith(error);
  });

  test('should pass through req, res, and next to the wrapped function', async () => {
    // Create an async function that uses req, res, next
    const asyncFn = jest.fn(async (req, res, next) => {
      // Just verify we received the parameters
      return { req, res, next };
    });
    
    // Wrap with asyncHandler
    const wrappedFn = asyncHandler(asyncFn);
    
    // Create mock request, response, and next
    const req = { body: { test: 'data' } };
    const res = { status: jest.fn() };
    const next = jest.fn();
    
    // Call the wrapped function
    await wrappedFn(req, res, next);
    
    // Verify the wrapped function was called with correct parameters
    expect(asyncFn).toHaveBeenCalledWith(req, res, next);
  });
});

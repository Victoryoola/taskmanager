/**
 * Property-Based Tests for Validation Middleware
 * Feature: api-error-handling
 * 
 * These tests verify universal properties that should hold across all validation scenarios
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 7.3, 8.4
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const { validateObjectId, validateTaskInput, validateTaskUpdate } = require('../../middleware/validation');

describe('Validation Middleware Property Tests', () => {
  
  // Property 3: Invalid ObjectId Returns 400 with Specific Message
  // Validates: Requirements 3.1, 3.2
  describe('Property 3: Invalid ObjectId Returns 400 with Specific Message', () => {
    test('should return 400 with "Invalid task ID format" for any invalid ObjectId string', () => {
      fc.assert(
        fc.property(
          fc.string().filter(str => !mongoose.Types.ObjectId.isValid(str)),
          (invalidId) => {
            const req = { params: { id: invalidId } };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateObjectId(req, res, next);
            
            // Verify 400 status code
            expect(res.status).toHaveBeenCalledWith(400);
            
            // Verify specific error message
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Invalid task ID format');
            
            // Verify next was not called
            expect(next).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 5: Missing or Empty Title Rejected
  // Validates: Requirements 2.1, 2.4
  describe('Property 5: Missing or Empty Title Rejected', () => {
    test('should return 400 for any empty or whitespace-only title', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(undefined),
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t\t'),
            fc.constant('\n\n')
          ),
          (title) => {
            const req = {
              body: title === undefined ? {} : { title }
            };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateTaskInput(req, res, next);
            
            // Verify 400 status code
            expect(res.status).toHaveBeenCalledWith(400);
            
            // Verify validation error response
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Validation failed');
            expect(jsonResponse.details).toEqual(
              expect.arrayContaining([
                expect.stringContaining('Title is required')
              ])
            );
            
            // Verify next was not called
            expect(next).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 6: Invalid Status Values Rejected
  // Validates: Requirements 2.2, 2.4
  describe('Property 6: Invalid Status Values Rejected', () => {
    test('should return 400 for any status value that is not "pending" or "completed"', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s !== 'pending' && s !== 'completed'),
          fc.string({ minLength: 1 }),
          (invalidStatus, title) => {
            const req = {
              body: {
                title,
                status: invalidStatus
              }
            };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateTaskInput(req, res, next);
            
            // Verify 400 status code
            expect(res.status).toHaveBeenCalledWith(400);
            
            // Verify validation error response
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Validation failed');
            expect(jsonResponse.details).toEqual(
              expect.arrayContaining([
                expect.stringContaining("Status must be either 'pending' or 'completed'")
              ])
            );
            
            // Verify next was not called
            expect(next).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 7: Empty Update Request Rejected
  // Validates: Requirements 2.3, 2.4
  describe('Property 7: Empty Update Request Rejected', () => {
    test('should return 400 for any update request with no valid fields', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({}),
            fc.record({
              invalidField: fc.string(),
              anotherInvalid: fc.integer()
            })
          ),
          (invalidBody) => {
            const req = {
              body: invalidBody
            };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateTaskUpdate(req, res, next);
            
            // Verify 400 status code
            expect(res.status).toHaveBeenCalledWith(400);
            
            // Verify validation error response
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Validation failed');
            expect(jsonResponse.details).toEqual(
              expect.arrayContaining([
                expect.stringContaining('At least one valid field')
              ])
            );
            
            // Verify next was not called
            expect(next).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 8: Input Sanitization Prevents Injection
  // Validates: Requirements 2.5
  describe('Property 8: Input Sanitization Prevents Injection', () => {
    test('should sanitize HTML script tags from any input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (content) => {
            const maliciousTitle = `<script>alert('xss')</script>${content}`;
            const req = {
              body: {
                title: maliciousTitle
              }
            };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateTaskInput(req, res, next);
            
            // Verify script tags are removed
            expect(req.body.title).not.toContain('<script>');
            expect(req.body.title).not.toContain('</script>');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should remove MongoDB operators from any string input', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('$where', '$ne', '$gt', '$lt', '$regex', '$or', '$and'),
          fc.string({ minLength: 1 }),
          (operator, content) => {
            const maliciousTitle = `${content} ${operator} malicious`;
            const req = {
              body: {
                title: maliciousTitle
              }
            };
            const res = {};
            const next = jest.fn();
            
            validateTaskInput(req, res, next);
            
            // Verify MongoDB operators are removed
            expect(req.body.title).not.toContain(operator);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should remove HTML tags from any input', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('<b>', '<i>', '<div>', '<span>', '<img>', '<a>'),
          fc.string({ minLength: 1 }),
          (tag, content) => {
            const maliciousTitle = `${tag}${content}`;
            const req = {
              body: {
                title: maliciousTitle
              }
            };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateTaskInput(req, res, next);
            
            // Verify HTML tags are removed
            expect(req.body.title).not.toContain(tag);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should prevent MongoDB operator injection in object keys', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => {
            // Filter out strings that would become empty after sanitization
            const sanitized = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                              .replace(/<[^>]+>/g, '')
                              .replace(/\$\w+/g, '');
            return sanitized.trim().length > 0;
          }),
          (content) => {
            const req = {
              body: {
                title: content,
                '$where': 'malicious code'
              }
            };
            const res = {};
            const next = jest.fn();
            
            validateTaskInput(req, res, next);
            
            // Verify MongoDB operator keys are removed
            expect(req.body).not.toHaveProperty('$where');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 14: Multiple Validation Errors Returned Together
  // Validates: Requirements 7.3
  describe('Property 14: Multiple Validation Errors Returned Together', () => {
    test('should return all validation errors in a single response', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s !== 'pending' && s !== 'completed'),
          (invalidStatus) => {
            const req = {
              body: {
                title: '',  // Invalid: empty title
                status: invalidStatus,  // Invalid: not in enum
                description: 123  // Invalid: not a string
              }
            };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateTaskInput(req, res, next);
            
            // Verify 400 status code
            expect(res.status).toHaveBeenCalledWith(400);
            
            // Verify multiple errors are returned
            const jsonResponse = res.json.mock.calls[0][0];
            expect(jsonResponse.error).toBe('Validation failed');
            expect(jsonResponse.details).toBeDefined();
            expect(Array.isArray(jsonResponse.details)).toBe(true);
            expect(jsonResponse.details.length).toBeGreaterThan(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 17: Validation Middleware Blocks Invalid Requests
  // Validates: Requirements 8.4
  describe('Property 17: Validation Middleware Blocks Invalid Requests', () => {
    test('should never call next() for any invalid ObjectId', () => {
      fc.assert(
        fc.property(
          fc.string().filter(str => !mongoose.Types.ObjectId.isValid(str)),
          (invalidId) => {
            const req = { params: { id: invalidId } };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateObjectId(req, res, next);
            
            // Verify next was NOT called
            expect(next).not.toHaveBeenCalled();
            
            // Verify error response was sent
            expect(res.status).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should never call next() for any invalid task input', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t\t'),
            fc.constant('\n\n')
          ),
          (invalidTitle) => {
            const req = {
              body: {
                title: invalidTitle
              }
            };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateTaskInput(req, res, next);
            
            // Verify next was NOT called
            expect(next).not.toHaveBeenCalled();
            
            // Verify error response was sent
            expect(res.status).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should never call next() for any empty update request', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({}),
            fc.record({
              invalidField: fc.string(),
              anotherInvalid: fc.integer()
            })
          ),
          (invalidBody) => {
            const req = {
              body: invalidBody
            };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateTaskUpdate(req, res, next);
            
            // Verify next was NOT called
            expect(next).not.toHaveBeenCalled();
            
            // Verify error response was sent
            expect(res.status).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should call next() for any valid task input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => {
            // Filter out strings that would become empty after sanitization
            const sanitized = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                              .replace(/<[^>]+>/g, '')
                              .replace(/\$\w+/g, '');
            return s.trim().length > 0 && sanitized.trim().length > 0;
          }),
          fc.constantFrom('pending', 'completed'),
          (validTitle, validStatus) => {
            const req = {
              body: {
                title: validTitle,
                status: validStatus
              }
            };
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };
            const next = jest.fn();
            
            validateTaskInput(req, res, next);
            
            // Verify next WAS called
            expect(next).toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

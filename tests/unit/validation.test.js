/**
 * Unit Tests for Validation Middleware
 * Feature: api-error-handling
 * 
 * Tests validation middleware for ObjectId, task input, and task updates
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 7.3, 8.2, 8.3, 8.4
 */

const { validateObjectId, validateTaskInput, validateTaskUpdate } = require('../../middleware/validation');

describe('Validation Middleware', () => {
  
  describe('validateObjectId', () => {
    test('should pass valid MongoDB ObjectId', () => {
      const req = { params: { id: '507f1f77bcf86cd799439011' } };
      const res = {};
      const next = jest.fn();
      
      validateObjectId(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    test('should reject invalid ObjectId format', () => {
      const req = { params: { id: 'invalid-id' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateObjectId(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid task ID format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject short invalid ID', () => {
      const req = { params: { id: '123' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateObjectId(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid task ID format'
      });
    });

    test('should reject empty string ID', () => {
      const req = { params: { id: '' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateObjectId(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateTaskInput', () => {
    test('should pass valid task input with all fields', () => {
      const req = {
        body: {
          title: 'Test Task',
          description: 'Test Description',
          status: 'pending'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    test('should pass valid task input with only required fields', () => {
      const req = {
        body: {
          title: 'Test Task'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should reject missing title', () => {
      const req = {
        body: {
          description: 'Test Description'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.stringContaining('Title is required')
        ])
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject empty title', () => {
      const req = {
        body: {
          title: ''
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.stringContaining('Title is required')
        ])
      });
    });

    test('should reject whitespace-only title', () => {
      const req = {
        body: {
          title: '   '
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject invalid status value', () => {
      const req = {
        body: {
          title: 'Test Task',
          status: 'invalid-status'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.stringContaining("Status must be either 'pending' or 'completed'")
        ])
      });
    });

    test('should accept valid status "completed"', () => {
      const req = {
        body: {
          title: 'Test Task',
          status: 'completed'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should return multiple validation errors', () => {
      const req = {
        body: {
          title: '',
          status: 'invalid',
          description: 123
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Validation failed');
      expect(response.details.length).toBeGreaterThan(1);
    });

    test('should sanitize HTML tags from title', () => {
      const req = {
        body: {
          title: '<script>alert("xss")</script>Test Task'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(req.body.title).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    test('should remove MongoDB operators from input', () => {
      const req = {
        body: {
          title: 'Test $where Task'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskInput(req, res, next);
      
      expect(req.body.title).not.toContain('$where');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateTaskUpdate', () => {
    test('should pass valid update with title', () => {
      const req = {
        body: {
          title: 'Updated Task'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskUpdate(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should pass valid update with status', () => {
      const req = {
        body: {
          status: 'completed'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskUpdate(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should pass valid update with description', () => {
      const req = {
        body: {
          description: 'Updated description'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskUpdate(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should pass valid update with multiple fields', () => {
      const req = {
        body: {
          title: 'Updated Task',
          status: 'completed',
          description: 'Updated description'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskUpdate(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should reject empty update body', () => {
      const req = {
        body: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateTaskUpdate(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.stringContaining('At least one valid field')
        ])
      });
    });

    test('should reject update with only invalid fields', () => {
      const req = {
        body: {
          invalidField: 'value'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateTaskUpdate(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject empty title in update', () => {
      const req = {
        body: {
          title: ''
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateTaskUpdate(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.stringContaining('Title must be a non-empty string')
        ])
      });
    });

    test('should reject invalid status in update', () => {
      const req = {
        body: {
          status: 'in-progress'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      validateTaskUpdate(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should sanitize input in updates', () => {
      const req = {
        body: {
          title: '<b>Bold</b> Task',
          description: '$ne malicious'
        }
      };
      const res = {};
      const next = jest.fn();
      
      validateTaskUpdate(req, res, next);
      
      expect(req.body.title).not.toContain('<b>');
      expect(req.body.description).not.toContain('$ne');
      expect(next).toHaveBeenCalled();
    });
  });
});

/**
 * Unit Tests for Task Routes
 * Feature: api-error-handling
 * 
 * Tests all task endpoints with valid/invalid inputs, 404 cases, and validation middleware
 * Validates: Requirements 3.3, 5.1, 5.2, 5.3, 5.4, 5.5
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Task = require('../../models/task');
const taskRoutes = require('../../routes/tasks');
const errorHandler = require('../../middleware/errorHandler');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/tasks', taskRoutes);
app.use(errorHandler);

let mongoServer;

// Setup in-memory MongoDB for testing
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  await Task.deleteMany({});
});

describe('Task Routes', () => {
  
  describe('POST /tasks - Create Task', () => {
    
    test('should create task with valid input and return 201', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending'
      };
      
      const response = await request(app)
        .post('/tasks')
        .send(taskData)
        .expect(201);
      
      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(taskData.title);
      expect(response.body.description).toBe(taskData.description);
      expect(response.body.status).toBe(taskData.status);
    });

    test('should create task with only required fields and return 201', async () => {
      const taskData = {
        title: 'Minimal Task'
      };
      
      const response = await request(app)
        .post('/tasks')
        .send(taskData)
        .expect(201);
      
      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(taskData.title);
      expect(response.body.status).toBe('pending'); // default value
    });

    test('should reject task creation without title (400)', async () => {
      const taskData = {
        description: 'No title provided'
      };
      
      const response = await request(app)
        .post('/tasks')
        .send(taskData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Title is required and must be a non-empty string');
    });

    test('should reject task creation with empty title (400)', async () => {
      const taskData = {
        title: ''
      };
      
      const response = await request(app)
        .post('/tasks')
        .send(taskData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.details).toContain('Title is required and must be a non-empty string');
    });

    test('should reject task creation with whitespace-only title (400)', async () => {
      const taskData = {
        title: '   '
      };
      
      const response = await request(app)
        .post('/tasks')
        .send(taskData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should reject task creation with invalid status (400)', async () => {
      const taskData = {
        title: 'Test Task',
        status: 'in-progress'
      };
      
      const response = await request(app)
        .post('/tasks')
        .send(taskData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.details).toContain("Status must be either 'pending' or 'completed'");
    });

    test('should apply validation middleware correctly', async () => {
      // Test that validation middleware blocks invalid requests before reaching handler
      const taskData = {
        title: '',
        status: 'invalid'
      };
      
      const response = await request(app)
        .post('/tasks')
        .send(taskData)
        .expect(400);
      
      // Should have multiple validation errors
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details.length).toBeGreaterThan(1);
      
      // Verify no task was created in database
      const taskCount = await Task.countDocuments();
      expect(taskCount).toBe(0);
    });
  });

  describe('GET /tasks - Get All Tasks', () => {
    
    test('should return empty array when no tasks exist (200)', async () => {
      const response = await request(app)
        .get('/tasks')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test('should return all tasks with valid data (200)', async () => {
      // Create test tasks
      await Task.create([
        { title: 'Task 1', status: 'pending' },
        { title: 'Task 2', status: 'completed' },
        { title: 'Task 3', description: 'With description' }
      ]);
      
      const response = await request(app)
        .get('/tasks')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0]).toHaveProperty('_id');
      expect(response.body[0]).toHaveProperty('title');
    });
  });

  describe('GET /tasks/:id - Get One Task', () => {
    
    test('should return task with valid ID (200)', async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test Description'
      });
      
      const response = await request(app)
        .get(`/tasks/${task._id}`)
        .expect(200);
      
      expect(response.body._id).toBe(task._id.toString());
      expect(response.body.title).toBe(task.title);
      expect(response.body.description).toBe(task.description);
    });

    test('should return 404 for non-existent task with valid ObjectId', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/tasks/${nonExistentId}`)
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Task not found');
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .get('/tasks/invalid-id-123')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid task ID format');
    });

    test('should apply validateObjectId middleware correctly', async () => {
      // Test that middleware blocks request before handler
      const response = await request(app)
        .get('/tasks/abc')
        .expect(400);
      
      expect(response.body.error).toBe('Invalid task ID format');
    });
  });

  describe('PUT /tasks/:id - Update Task', () => {
    
    test('should update task with valid data (200)', async () => {
      const task = await Task.create({
        title: 'Original Title',
        status: 'pending'
      });
      
      const updateData = {
        title: 'Updated Title',
        status: 'completed'
      };
      
      const response = await request(app)
        .put(`/tasks/${task._id}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body._id).toBe(task._id.toString());
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.status).toBe(updateData.status);
    });

    test('should update only title (200)', async () => {
      const task = await Task.create({
        title: 'Original Title',
        status: 'pending'
      });
      
      const response = await request(app)
        .put(`/tasks/${task._id}`)
        .send({ title: 'New Title' })
        .expect(200);
      
      expect(response.body.title).toBe('New Title');
      expect(response.body.status).toBe('pending'); // unchanged
    });

    test('should update only status (200)', async () => {
      const task = await Task.create({
        title: 'Test Task',
        status: 'pending'
      });
      
      const response = await request(app)
        .put(`/tasks/${task._id}`)
        .send({ status: 'completed' })
        .expect(200);
      
      expect(response.body.title).toBe('Test Task'); // unchanged
      expect(response.body.status).toBe('completed');
    });

    test('should return 404 for non-existent task', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/tasks/${nonExistentId}`)
        .send({ title: 'Updated' })
        .expect(404);
      
      expect(response.body.error).toBe('Task not found');
    });

    test('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .put('/tasks/invalid-id')
        .send({ title: 'Updated' })
        .expect(400);
      
      expect(response.body.error).toBe('Invalid task ID format');
    });

    test('should return 400 for empty update body', async () => {
      const task = await Task.create({ title: 'Test Task' });
      
      const response = await request(app)
        .put(`/tasks/${task._id}`)
        .send({})
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('At least one valid field (title, status, or description) must be provided');
    });

    test('should return 400 for invalid status value', async () => {
      const task = await Task.create({ title: 'Test Task' });
      
      const response = await request(app)
        .put(`/tasks/${task._id}`)
        .send({ status: 'in-progress' })
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain("Status must be either 'pending' or 'completed'");
    });

    test('should return 400 for empty title', async () => {
      const task = await Task.create({ title: 'Test Task' });
      
      const response = await request(app)
        .put(`/tasks/${task._id}`)
        .send({ title: '' })
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
    });

    test('should apply both validateObjectId and validateTaskUpdate middleware', async () => {
      // Test invalid ID (validateObjectId should catch)
      const response1 = await request(app)
        .put('/tasks/invalid')
        .send({ title: 'Updated' })
        .expect(400);
      
      expect(response1.body.error).toBe('Invalid task ID format');
      
      // Test valid ID but invalid update (validateTaskUpdate should catch)
      const task = await Task.create({ title: 'Test' });
      const response2 = await request(app)
        .put(`/tasks/${task._id}`)
        .send({})
        .expect(400);
      
      expect(response2.body.error).toBe('Validation failed');
    });
  });

  describe('DELETE /tasks/:id - Delete Task', () => {
    
    test('should delete task with valid ID (200)', async () => {
      const task = await Task.create({
        title: 'Task to Delete'
      });
      
      const response = await request(app)
        .delete(`/tasks/${task._id}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Task deleted');
      
      // Verify task was actually deleted
      const deletedTask = await Task.findById(task._id);
      expect(deletedTask).toBeNull();
    });

    test('should return 404 for non-existent task', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/tasks/${nonExistentId}`)
        .expect(404);
      
      expect(response.body.error).toBe('Task not found');
    });

    test('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .delete('/tasks/not-a-valid-id')
        .expect(400);
      
      expect(response.body.error).toBe('Invalid task ID format');
    });

    test('should apply validateObjectId middleware correctly', async () => {
      const response = await request(app)
        .delete('/tasks/123')
        .expect(400);
      
      expect(response.body.error).toBe('Invalid task ID format');
      
      // Verify no tasks were deleted
      await Task.create({ title: 'Safe Task' });
      const taskCount = await Task.countDocuments();
      expect(taskCount).toBe(1);
    });
  });

  describe('Validation Middleware Integration', () => {
    
    test('POST should block invalid requests before handler execution', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: '', status: 'invalid' })
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details.length).toBeGreaterThan(0);
      
      // Verify handler was never reached (no task created)
      const count = await Task.countDocuments();
      expect(count).toBe(0);
    });

    test('PUT should apply validateObjectId before validateTaskUpdate', async () => {
      // Invalid ID should be caught first
      const response = await request(app)
        .put('/tasks/invalid')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBe('Invalid task ID format');
    });

    test('GET/:id should validate ObjectId before querying database', async () => {
      const response = await request(app)
        .get('/tasks/short')
        .expect(400);
      
      expect(response.body.error).toBe('Invalid task ID format');
    });

    test('DELETE should validate ObjectId before attempting deletion', async () => {
      const response = await request(app)
        .delete('/tasks/xyz')
        .expect(400);
      
      expect(response.body.error).toBe('Invalid task ID format');
    });
  });

  describe('Status Code Consistency', () => {
    
    test('successful creation returns 201', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'New Task' })
        .expect(201);
    });

    test('successful retrieval returns 200', async () => {
      const task = await Task.create({ title: 'Test' });
      await request(app)
        .get(`/tasks/${task._id}`)
        .expect(200);
    });

    test('successful update returns 200', async () => {
      const task = await Task.create({ title: 'Test' });
      await request(app)
        .put(`/tasks/${task._id}`)
        .send({ title: 'Updated' })
        .expect(200);
    });

    test('successful deletion returns 200', async () => {
      const task = await Task.create({ title: 'Test' });
      await request(app)
        .delete(`/tasks/${task._id}`)
        .expect(200);
    });

    test('not found returns 404', async () => {
      const id = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/tasks/${id}`)
        .expect(404);
    });

    test('validation failure returns 400', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: '' })
        .expect(400);
    });

    test('invalid ObjectId returns 400', async () => {
      await request(app)
        .get('/tasks/invalid')
        .expect(400);
    });
  });
});

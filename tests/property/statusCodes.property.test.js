/**
 * Property-Based Tests for Route Status Codes
 * Feature: api-error-handling
 * 
 * These tests verify that routes return correct HTTP status codes
 * Validates: Requirements 3.3, 5.1, 5.2, 5.3
 */

const fc = require('fast-check');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const Task = require('../../models/task');
const taskRoutes = require('../../routes/tasks');
const errorHandler = require('../../middleware/errorHandler');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/tasks', taskRoutes);
  app.use(errorHandler);
  return app;
};

describe('Route Status Codes Property Tests', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    app = createTestApp();
  }, 60000); // 60 second timeout for MongoDB memory server startup

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  }, 30000);

  beforeEach(async () => {
    // Clear database before each test
    await Task.deleteMany({});
  });

  // Property 4: Valid Non-Existent ObjectId Returns 404
  // Validates: Requirements 3.3, 5.3
  describe('Property 4: Valid Non-Existent ObjectId Returns 404', () => {
    test('GET /tasks/:id should return 404 for any valid but non-existent ObjectId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          async (seed) => {
            // Generate a new ObjectId that doesn't exist in database
            const objectId = new mongoose.Types.ObjectId();
            await Task.deleteOne({ _id: objectId });

            const response = await request(app)
              .get(`/tasks/${objectId.toString()}`)
              .expect(404);

            expect(response.body.error).toBe('Task not found');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('PUT /tasks/:id should return 404 for any valid but non-existent ObjectId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (seed, title) => {
            // Generate a new ObjectId that doesn't exist in database
            const objectId = new mongoose.Types.ObjectId();
            await Task.deleteOne({ _id: objectId });

            const response = await request(app)
              .put(`/tasks/${objectId.toString()}`)
              .send({ title })
              .expect(404);

            expect(response.body.error).toBe('Task not found');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('DELETE /tasks/:id should return 404 for any valid but non-existent ObjectId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          async (seed) => {
            // Generate a new ObjectId that doesn't exist in database
            const objectId = new mongoose.Types.ObjectId();
            await Task.deleteOne({ _id: objectId });

            const response = await request(app)
              .delete(`/tasks/${objectId.toString()}`)
              .expect(404);

            expect(response.body.error).toBe('Task not found');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 11: Successful Creation Returns 201
  // Validates: Requirements 5.1
  describe('Property 11: Successful Creation Returns 201', () => {
    test('POST /tasks should return 201 for any valid task creation request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => {
            // Filter out strings that would become empty after sanitization
            const sanitized = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                              .replace(/<[^>]+>/g, '')
                              .replace(/\$\w+/g, '');
            return s.trim().length > 0 && sanitized.trim().length > 0;
          }),
          fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          fc.constantFrom('pending', 'completed'),
          async (title, description, status) => {
            const taskData = { title, status };
            if (description !== undefined) {
              taskData.description = description;
            }

            const response = await request(app)
              .post('/tasks')
              .send(taskData)
              .expect(201);

            // Verify response contains created task
            expect(response.body).toHaveProperty('_id');
            expect(response.body).toHaveProperty('title');
            expect(response.body.status).toBe(status);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 12: Successful Operations Return 200
  // Validates: Requirements 5.2
  describe('Property 12: Successful Operations Return 200', () => {
    test('GET /tasks should return 200 for successful retrieval', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom('pending', 'completed')
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (tasks) => {
            // Clear database and create tasks
            await Task.deleteMany({});
            if (tasks.length > 0) {
              await Task.insertMany(tasks);
            }

            const response = await request(app)
              .get('/tasks')
              .expect(200);

            // Verify response is an array
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(tasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('GET /tasks/:id should return 200 for any existing task', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('pending', 'completed'),
          async (title, status) => {
            // Create a task
            const task = await Task.create({ title, status });

            const response = await request(app)
              .get(`/tasks/${task._id.toString()}`)
              .expect(200);

            // Verify response contains the task
            expect(response.body._id).toBe(task._id.toString());
            expect(response.body.title).toBe(title);
            expect(response.body.status).toBe(status);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('PUT /tasks/:id should return 200 for successful update', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => {
            const sanitized = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                              .replace(/<[^>]+>/g, '')
                              .replace(/\$\w+/g, '');
            return s.trim().length > 0 && sanitized.trim().length > 0;
          }),
          fc.constantFrom('pending', 'completed'),
          async (originalTitle, newTitle, newStatus) => {
            // Create a task
            const task = await Task.create({ title: originalTitle });

            const response = await request(app)
              .put(`/tasks/${task._id.toString()}`)
              .send({ title: newTitle, status: newStatus })
              .expect(200);

            // Verify response contains updated task
            expect(response.body._id).toBe(task._id.toString());
            expect(response.body.status).toBe(newStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('DELETE /tasks/:id should return 200 for successful deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('pending', 'completed'),
          async (title, status) => {
            // Create a task
            const task = await Task.create({ title, status });

            const response = await request(app)
              .delete(`/tasks/${task._id.toString()}`)
              .expect(200);

            // Verify response contains success message
            expect(response.body.message).toBe('Task deleted');

            // Verify task is actually deleted
            const deletedTask = await Task.findById(task._id);
            expect(deletedTask).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

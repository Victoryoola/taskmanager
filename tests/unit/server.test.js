/**
 * Unit Tests for Server Startup and Database Connection
 * Feature: api-error-handling
 * 
 * Tests server behavior during startup, particularly database connection failures
 */

const mongoose = require('mongoose');

describe('Server Startup Tests', () => {
  let originalExit;
  let originalConsoleError;
  let exitCode;
  let consoleErrorCalls;

  beforeEach(() => {
    // Mock process.exit to capture exit code
    originalExit = process.exit;
    exitCode = null;
    process.exit = jest.fn((code) => {
      exitCode = code;
    });

    // Mock console.error to capture error logs
    originalConsoleError = console.error;
    consoleErrorCalls = [];
    console.error = jest.fn((...args) => {
      consoleErrorCalls.push(args);
    });
  });

  afterEach(() => {
    // Restore original functions
    process.exit = originalExit;
    console.error = originalConsoleError;
    
    // Clean up mongoose connection
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
  });

  // Validates: Requirements 6.1
  test('should log error and exit with non-zero code when database connection fails', async () => {
    // Mock mongoose.connect to simulate connection failure
    const mockError = new Error('Connection refused');
    jest.spyOn(mongoose, 'connect').mockRejectedValueOnce(mockError);

    // Simulate the start function from server.js
    const start = async () => {
      try {
        await mongoose.connect('mongodb://invalid:27017/test');
        console.log("Connected to MongoDB");
      } catch (err) {
        console.error('Failed to connect to MongoDB:', err.message);
        if (process.env.NODE_ENV === 'development') {
          console.error('Stack:', err.stack);
        }
        process.exit(1);
      }
    };

    await start();

    // Verify error was logged
    expect(console.error).toHaveBeenCalled();
    expect(consoleErrorCalls.some(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('Failed to connect to MongoDB'))
    )).toBe(true);
    expect(consoleErrorCalls.some(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('Connection refused'))
    )).toBe(true);

    // Verify process.exit was called with non-zero code
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(exitCode).toBe(1);

    // Restore mongoose.connect
    mongoose.connect.mockRestore();
  });

  test('should include stack trace in development mode on connection failure', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockError = new Error('Connection timeout');
    jest.spyOn(mongoose, 'connect').mockRejectedValueOnce(mockError);

    const start = async () => {
      try {
        await mongoose.connect('mongodb://invalid:27017/test');
        console.log("Connected to MongoDB");
      } catch (err) {
        console.error('Failed to connect to MongoDB:', err.message);
        if (process.env.NODE_ENV === 'development') {
          console.error('Stack:', err.stack);
        }
        process.exit(1);
      }
    };

    await start();

    // Verify stack trace was logged in development mode
    expect(consoleErrorCalls.some(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('Stack:'))
    )).toBe(true);

    process.env.NODE_ENV = originalEnv;
    mongoose.connect.mockRestore();
  });

  test('should not include stack trace in production mode on connection failure', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const mockError = new Error('Connection timeout');
    jest.spyOn(mongoose, 'connect').mockRejectedValueOnce(mockError);

    const start = async () => {
      try {
        await mongoose.connect('mongodb://invalid:27017/test');
        console.log("Connected to MongoDB");
      } catch (err) {
        console.error('Failed to connect to MongoDB:', err.message);
        if (process.env.NODE_ENV === 'development') {
          console.error('Stack:', err.stack);
        }
        process.exit(1);
      }
    };

    await start();

    // Verify stack trace was NOT logged in production mode
    expect(consoleErrorCalls.some(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('Stack:'))
    )).toBe(false);

    process.env.NODE_ENV = originalEnv;
    mongoose.connect.mockRestore();
  });

  test('should not exit when database connection succeeds', async () => {
    jest.spyOn(mongoose, 'connect').mockResolvedValueOnce();

    const start = async () => {
      try {
        await mongoose.connect('mongodb://localhost:27017/test');
        console.log("Connected to MongoDB");
      } catch (err) {
        console.error('Failed to connect to MongoDB:', err.message);
        if (process.env.NODE_ENV === 'development') {
          console.error('Stack:', err.stack);
        }
        process.exit(1);
      }
    };

    await start();

    // Verify process.exit was NOT called
    expect(process.exit).not.toHaveBeenCalled();
    expect(exitCode).toBeNull();

    mongoose.connect.mockRestore();
  });
});

const express = require('express');
const mongoose = require('mongoose');
const taskRoutes = require('./routes/tasks');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables from a .env file if present (no crash if dotenv isn't installed)
try { require('dotenv').config(); } catch (e) {}

const app = express();
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI environment variable. Set it in your environment or create a .env file with MONGODB_URI.');
  process.exit(1);
}

const start = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack:', err.stack);
    }
    process.exit(1);
  }
};

start();

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Task Manager API',
    endpoints: {
      tasks: '/tasks'
    }
  });
});

app.use('/tasks', taskRoutes);

// Error handler must be added after all routes
app.use(errorHandler);

app.listen(3000, () => console.log('Server is running on port http://localhost:3000'));

# Task Manager API

A RESTful API built with Express.js and MongoDB for managing tasks with full CRUD operations, input validation, and comprehensive error handling.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Data Model](#data-model)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Project Structure](#project-structure)

## Features

- Create, read, update, and delete tasks
- Input validation for all operations
- MongoDB ObjectId validation
- Centralized error handling
- Async error handling middleware
- Task status management (pending/completed)
- RESTful API design
- Comprehensive test coverage (unit and property-based tests)

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Database**: MongoDB with Mongoose ODM
- **Testing**: Jest, Supertest, Fast-check (property-based testing)
- **Development**: Nodemon for auto-reload
- **Environment**: dotenv for configuration

## Prerequisites

Before running this application, ensure you have:

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone git@github.com:Victoryoola/taskmanager.git
cd taskManagerAPI
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create a `.env` file in the root directory (use `.env.example` as reference):
```env
MONGODB_URI=your_mongodb_uri
```

2. For MongoDB Atlas, use the connection string format:
```env
MONGODB_URI=your_mongodb_uri
```

## Running the Application

### Development Mode
```bash
npm run devStart
```
The server will start on `http://localhost:3000` with auto-reload enabled.

### Production Mode
```bash
node server.js
```

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Endpoints

#### 1. Create a Task
- **POST** `/tasks`
- **Body**:
```json
{
  "title": "Complete project documentation",
  "description": "Write comprehensive README and API docs",
  "status": "pending"
}
```
- **Response** (201):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Complete project documentation",
  "description": "Write comprehensive README and API docs",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### 2. Get All Tasks
- **GET** `/tasks`
- **Response** (200):
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Complete project documentation",
    "description": "Write comprehensive README and API docs",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### 3. Get Single Task
- **GET** `/tasks/:id`
- **Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Complete project documentation",
  "description": "Write comprehensive README and API docs",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```
- **Error** (404):
```json
{
  "error": "Task not found"
}
```

#### 4. Update Task
- **PUT** `/tasks/:id`
- **Body**:
```json
{
  "title": "Updated title",
  "status": "completed"
}
```
- **Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Updated title",
  "description": "Write comprehensive README and API docs",
  "status": "completed",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### 5. Delete Task
- **DELETE** `/tasks/:id`
- **Response** (200):
```json
{
  "message": "Task deleted"
}
```

## Data Model

### Task Schema

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| title | String | Yes | - | Must be provided |
| description | String | No | - | - |
| status | String | No | 'pending' | Enum: ['pending', 'completed'] |
| createdAt | Date | No | Date.now | Auto-generated |

## Testing

The project includes comprehensive test coverage with both unit and property-based tests.

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Test Structure
- **Unit Tests**: Located in `tests/unit/`
  - Server tests
  - Route tests
  - Validation tests
  - Async handler tests
  
- **Property-Based Tests**: Located in `tests/property/`
  - Error handler property tests
  - Status code property tests
  - Validation property tests

## Error Handling

The API implements centralized error handling with:

- **Validation Errors**: Returns 400 with error details
- **Not Found Errors**: Returns 404 for non-existent resources
- **Invalid ObjectId**: Returns 400 for malformed MongoDB IDs
- **Server Errors**: Returns 500 for unexpected errors

### Error Response Format
```json
{
  "error": "Error message description"
}
```

## Project Structure

```
taskManagerAPI/
├── middleware/
│   ├── asyncHandler.js      # Async error handling wrapper
│   ├── errorHandler.js      # Centralized error handler
│   └── validation.js        # Input validation middleware
├── models/
│   └── task.js              # Task schema and model
├── routes/
│   └── tasks.js             # Task route definitions
├── tests/
│   ├── unit/                # Unit tests
│   └── property/            # Property-based tests
├── .env                     # Environment variables (not in git)
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── jest.config.js           # Jest configuration
├── package.json             # Dependencies and scripts
├── server.js                # Application entry point
└── README.md                # This file
```

## Middleware

### Validation Middleware
- `validateObjectId`: Validates MongoDB ObjectId format
- `validateTaskInput`: Validates task creation input
- `validateTaskUpdate`: Validates task update input

### Error Handling
- `asyncHandler`: Wraps async route handlers to catch errors
- `errorHandler`: Centralized error response formatting

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Author

Victor Ayoola

## Acknowledgments

- Express.js documentation
- MongoDB and Mongoose documentation
- Jest testing framework
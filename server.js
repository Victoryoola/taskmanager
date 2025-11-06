const express = require('express');
const mongoose = require('mongoose');
const taskRoutes = require('./routes/tasks');

const app = express();
app.use(express.json());

const start = async () => {
  try {
    await mongoose.connect("mongodb+srv://eriangel10:jesusislord@cluster0.7gf6je4.mongodb.net/");
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error(err);
  }
};

start();
app.use('/tasks', taskRoutes);

app.listen(3000, () => console.log('Server is running on port 3000'));

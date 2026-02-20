const express = require("express");
const router = express.Router();
const Task = require("../models/task");
const asyncHandler = require("../middleware/asyncHandler");
const { validateObjectId, validateTaskInput, validateTaskUpdate } = require("../middleware/validation");

// Create Task
router.post("/", validateTaskInput, async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get All Tasks
router.get("/", asyncHandler(async (req, res) => {
  const tasks = await Task.find();
  res.status(200).json(tasks);
}));

// Get One Task
router.get("/:id", validateObjectId, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.status(200).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Task
router.put("/:id", validateObjectId, validateTaskUpdate, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.status(200).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Task
router.delete("/:id", validateObjectId, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.status(200).json({ message: "Task deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Employee = require('../models/employee');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all employees
router.get('/', verifyToken, async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new employee (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single employee by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all employees for the logged-in user's company only
router.get('/', verifyToken, async (req, res) => {
  try {
    const employees = await User.find({ 
      role: 'Employee', 
      companyId: req.user.companyId 
    });
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new employee and their initial salary structure (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    // 1. Extract salary fields from req.body so they don't pollute the User model if it doesn't expect them
    const { baseSalary, paymentFrequency, deductions, password, ...userData } = req.body;

    // 2. Create the Employee User record
    const employee = await User.create({ 
      ...userData, 
      password: password || 'DefaultPassword123',
      role: 'Employee', 
      companyId: req.user.companyId 
    });

    // 3. Automatically create their initial Salary record if baseSalary is provided
    if (baseSalary) {
      await Salary.create({
        employee: employee._id,
        baseSalary,
        paymentFrequency: paymentFrequency || 'Monthly',
        deductions: deductions || []
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Employee and salary structure created successfully', 
      data: employee 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single employee by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const updatedEmployee = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, // Automatically updates whatever fields Naheejat's frontend sends (phone, address, isActive, etc.)
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedEmployee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.status(200).json({ success: true, message: 'Employee updated successfully', data: updatedEmployee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
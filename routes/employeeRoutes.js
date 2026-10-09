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

// Create a new employee (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const employee = await User.create({ ...req.body, role: 'Employee', companyId: req.user.companyId });
    res.status(201).json({ success: true, data: employee });
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
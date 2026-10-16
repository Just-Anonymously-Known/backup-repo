const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Salary = require('../models/salary');
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
    // 1. Extract fields from req.body (allows employeeId to be manually typed from the form)
    const { baseSalary, paymentFrequency, deductions, password, companyId, ...userData } = req.body;

    // 2. Create the Employee User record using the manually typed employeeId from the form
    const employee = await User.create({
      ...userData,
      password: password || 'DefaultPassword123',
      role: 'Employee',
      companyId: req.user.companyId // Securely auto-generated from the admin's token
    });

    // 3. Automatically create their initial Salary record if baseSalary is provided
    if (baseSalary) {
      await Salary.create({
        employee: employee._id,
        baseSalary,
        paymentFrequency: paymentFrequency || 'Monthly',
        deductions: deductions || [],
        companyId: req.user.companyId
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


router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employee, baseSalary, deductions, paymentFrequency } = req.body;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    let salaryRecord = await Salary.findOne({ employee });
    if (salaryRecord) {
      salaryRecord.baseSalary = baseSalary || salaryRecord.baseSalary;
      salaryRecord.deductions = deductions || salaryRecord.deductions;
      salaryRecord.paymentFrequency = paymentFrequency || salaryRecord.paymentFrequency;
      salaryRecord.companyId = salaryRecord.companyId || companyId;
      await salaryRecord.save();
      return res.status(200).json({ success: true, message: 'Salary updated successfully', data: salaryRecord });
    }

    salaryRecord = await Salary.create({
      employee,
      companyId,
      baseSalary: Number(baseSalary),
      deductions,
      paymentFrequency
    });

    res.status(201).json({ success: true, data: salaryRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Salary = require('../models/salary');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Create or update salary structure for an employee
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employee, baseSalary, deductions, paymentFrequency } = req.body;

    let salaryRecord = await Salary.findOne({ employee });
    if (salaryRecord) {
      salaryRecord.baseSalary = baseSalary || salaryRecord.baseSalary;
      salaryRecord.deductions = deductions || salaryRecord.deductions;
      salaryRecord.paymentFrequency = paymentFrequency || salaryRecord.paymentFrequency;
      await salaryRecord.save();
      return res.status(200).json({ success: true, message: 'Salary updated successfully', data: salaryRecord });
    }

    salaryRecord = await Salary.create({
      employee,
      baseSalary,
      deductions,
      paymentFrequency
    });

    res.status(201).json({ success: true, data: salaryRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get salary for the currently logged-in employee (Self-service for mobile)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const salary = await Salary.findOne({ employee: req.user.id }).populate('employee');
    if (!salary) {
      return res.status(404).json({ success: false, error: 'Salary record not found' });
    }
    res.status(200).json({ success: true, data: salary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get salary by employee ID
router.get('/:employeeId', verifyToken, async (req, res) => {
  try {
    const salary = await Salary.findOne({ employee: req.params.employeeId }).populate('employee');
    if (!salary) return res.status(404).json({ success: false, error: 'Salary record not found' });
    res.status(200).json({ success: true, data: salary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
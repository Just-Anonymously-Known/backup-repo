const express = require('express');
const router = express.Router();
const Payroll = require('../models/payroll');
const Salary = require('../models/salary');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Generate Payroll for an Employee
router.post('/generate', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employee, payPeriod } = req.body;

    // Find the employee's salary configuration
    const salaryRecord = await Salary.findOne({ employee });
    if (!salaryRecord) {
      return res.status(404).json({ success: false, error: 'Salary structure not found for this employee' });
    }

    const baseSalary = salaryRecord.baseSalary;
    
    // Calculate total deductions
    const totalDeductions = salaryRecord.deductions.reduce((acc, item) => acc + item.amount, 0);
    const grossPay = baseSalary;
    const netPay = grossPay - totalDeductions;

    const payroll = await Payroll.create({
      employee,
      payPeriod,
      baseSalary,
      totalDeductions,
      grossPay,
      netPay,
      status: 'Draft'
    });

    res.status(201).json({ success: true, message: 'Payroll generated successfully', data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all payroll records
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const payrolls = await Payroll.find().populate('employee');
    res.status(200).json({ success: true, count: payrolls.length, data: payrolls });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
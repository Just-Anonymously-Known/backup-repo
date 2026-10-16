const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Salary = require('../models/salary');
const Payroll = require('../models/payroll'); // Required to sync payroll records
const { verifyToken, isAdmin } = require('../middleware/auth');

// Create or update salary structure for an employee and sync Payroll record
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employee, baseSalary, deductions, paymentFrequency } = req.body;
    const companyId = req.user.companyId;

    let salaryRecord = await Salary.findOne({ employee });
    if (salaryRecord) {
      salaryRecord.baseSalary = baseSalary !== undefined ? baseSalary : salaryRecord.baseSalary;
      salaryRecord.deductions = deductions !== undefined ? deductions : salaryRecord.deductions;
      salaryRecord.paymentFrequency = paymentFrequency || salaryRecord.paymentFrequency;
      await salaryRecord.save();
    } else {
      salaryRecord = await Salary.create({
        employee,
        companyId,
        baseSalary: baseSalary || 0,
        deductions: deductions || [],
        paymentFrequency: paymentFrequency || 'Monthly'
      });
    }

    // CALCULATE AND SAVE PERMANENT PAYROLL VALUES (grossPay, totalDeductions, netPay)
    const base = Number(salaryRecord.baseSalary) || 0;
    const totalDeductions = salaryRecord.deductions && Array.isArray(salaryRecord.deductions)
      ? salaryRecord.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
      : Number(salaryRecord.deductions || 0);

    const grossPay = base;
    const netPay = grossPay - totalDeductions;

    // Upsert directly into the Payroll collection so the dashboard reads saved values instantly
    await Payroll.findOneAndUpdate(
      { employee, companyId },
      {
        payperiod: 'Current',
        baseSalary: base,
        grossPay,
        totalDeductions,
        netPay,
        status: 'Unpaid'
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, message: 'Salary and payroll calculated & saved successfully', data: salaryRecord });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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
    const { employeeId } = req.params;

    let query = { employee: employeeId };
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      query = { 
        $or: [
          { employee: employeeId },
          { employee: new mongoose.Types.ObjectId(employeeId) }
        ]
      };
    }

    const salary = await Salary.findOne(query).populate('employee');
    if (!salary) {
      return res.status(404).json({ success: false, error: 'Salary record not found' });
    }
    res.status(200).json({ success: true, data: salary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
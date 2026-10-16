const express = require('express');
const router = express.Router();
const Payroll = require('../models/payroll');
const Salary = require('../models/salary');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Generate Payroll for an Employee
router.post('/generate', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employee, payperiod, companyId } = req.body;

   // Find the employee's salary configuration
let salaryRecord = await Salary.findOne({ employee });

if (!salaryRecord) {
  return res.status(404).json({ 
    success: false, 
    error: "Salary configuration not found for this employee. Please assign a salary when creating the employee." 
  });
}
    
    // Calculate total deductions
    const totalDeductions = salaryRecord.deductions.reduce((acc, item) => acc + item.amount, 0);
    const grossPay = salaryRecord.baseSalary;
    const netPay = grossPay - totalDeductions;

    const payroll = await Payroll.create({
  companyId: companyId || req.user?.companyId,
  employee,
  payperiod: payperiod || req.body.payperiod,
  baseSalary: salaryRecord.baseSalary,
  totalDeductions,
  grossPay,
  netPay,
  status: req.body.status || "Draft" 
});

    res.status(201).json({ success: true, message: 'Payroll generated successfully', data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all salary/payroll records for the company
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const salaries = await Salary.find({ companyId: req.user.companyId })
      .populate('employee', 'name email employeeId department jobTitle');

    res.status(200).json({
      success: true,
      count: salaries.length,
      data: salaries
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Payroll Payment Status (e.g., Mark as Paid)
router.patch('/:id/payment', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status: status || 'Paid' },
      { new: true }
    );

    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll record not found' });
    }

    res.status(200).json({ success: true, message: 'Payroll status updated successfully', data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update/Patch payroll record by ID (Fixes Najeehat's frontend error)
router.patch('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedPayroll = await Payroll.findByIdAndUpdate(id, updates, { 
      new: true, 
      runValidators: true 
    });

    if (!updatedPayroll) {
      return res.status(404).json({ success: false, error: 'Payroll record not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Payroll updated successfully', 
      data: updatedPayroll 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
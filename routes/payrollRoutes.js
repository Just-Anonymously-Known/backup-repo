const express = require('express');
const router = express.Router();
const Payroll = require('../models/payroll');
const Salary = require('../models/salary');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Generate Payroll for an Employee
router.post('/generate', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employee, payperiod, baseSalary, deductions, tax, extras } = req.body;
    const companyId = req.user.companyId;

    // SCENARIO A: Generate for ALL employees in the company if no single employee ID is provided
    if (!employee) {
      const allSalaries = await Salary.find({ companyId });
      if (!allSalaries || allSalaries.length === 0) {
        return res.status(404).json({ success: false, error: 'No salary records found for this company to generate payroll.' });
      }

      const generatedPayrolls = [];

      for (let sal of allSalaries) {
        const base = Number(sal.baseSalary) || 0;
        const totalDeductions = sal.deductions ? sal.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) : 0;
        const grossPay = base;
        const netPay = grossPay - totalDeductions;

        let payrollRecord = await Payroll.findOneAndUpdate(
          { employee: sal.employee, payperiod, companyId },
          {
            baseSalary: base,
            totalDeductions,
            grossPay,
            netPay,
            status: 'Unpaid'
          },
          { upsert: true, new: true }
        );
        generatedPayrolls.push(payrollRecord);
      }

      return res.status(201).json({ 
        success: true, 
        message: `Payroll generated successfully for all ${generatedPayrolls.length} employees`, 
        count: generatedPayrolls.length,
        data: generatedPayrolls 
      });
    }

    // SCENARIO B: Generate/Update for a SINGLE employee (your original logic)
    const base = Number(baseSalary) || 0;
    const totalDeductions = Number(deductions) || 0;
    const taxAmount = Number(tax) || 0;
    const extraPay = Number(extras) || 0;

    const grossPay = base + extraPay;
    const netPay = grossPay - totalDeductions - taxAmount;

    let payrollRecord = await Payroll.findOneAndUpdate(
      { employee, payperiod, companyId },
      {
        baseSalary: base,
        totalDeductions: totalDeductions + taxAmount,
        tax: taxAmount,
        extras: extraPay,
        grossPay,
        netPay,
        status: 'Unpaid'
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'Payroll generated successfully', data: payrollRecord });
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
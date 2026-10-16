const express = require('express');
const router = express.Router();
const Payroll = require('../models/payroll');
const Salary = require('../models/salary');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Generate Payroll for an Employee
// Generate Payroll for a single employee OR all employees in the company
router.post('/generate', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employee, payperiod, baseSalary, deductions, tax, extras } = req.body;
    const companyId = req.user.companyId;

    // SCENARIO A: Bulk generate for ALL employees if no single employee ID is provided
    if (!employee) {
      const allSalaries = await Salary.find({ companyId });
      if (!allSalaries || allSalaries.length === 0) {
        return res.status(404).json({ success: false, error: 'No salary records found for this company.' });
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

    // SCENARIO B: Generate/Update for a SINGLE employee
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

    return res.status(201).json({ success: true, message: 'Payroll generated successfully', data: payrollRecord });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get all payroll records and calculated summary metrics for the dashboard
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const payrolls = await Payroll.find({ companyId: req.user.companyId })
      .populate('employee', 'name email employeeId department jobTitle');

    // Calculate overall summary metrics for the top card
    const summary = payrolls.reduce((acc, curr) => {
      acc.totalGross += Number(curr.grossPay || curr.baseSalary || 0);
      acc.totalDeductions += Number(curr.totalDeductions || curr.tax || 0);
      acc.totalNet += Number(curr.netPay || curr.baseSalary || 0);
      return acc;
    }, { totalGross: 0, totalDeductions: 0, totalNet: 0 });

    res.status(200).json({
      success: true,
      count: payrolls.length,
      summary: {
        employeeCount: payrolls.length,
        totalGrossPay: summary.totalGross,
        totalDeductions: summary.totalDeductions,
        totalNetPay: summary.totalNet
      },
      data: payrolls
    });
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
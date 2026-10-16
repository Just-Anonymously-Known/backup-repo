const express = require('express');
const router = express.Router();
const Payroll = require('../models/payroll');
const Salary = require('../models/salary');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Generate or Update Payroll for a single employee OR all employees in the company
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
          { employee: sal.employee, companyId },
          {
            payperiod: payperiod || 'Current',
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

    // SCENARIO B: Generate or Update for a SINGLE employee
    let salaryRecord = await Salary.findOne({ employee });
    const base = Number(baseSalary) || Number(salaryRecord?.baseSalary) || 0;
    const itemizedDeductions = deductions !== undefined ? Number(deductions) : (salaryRecord?.deductions ? salaryRecord.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) : 0);
    const taxAmount = Number(tax) || 0;
    const extraPay = Number(extras) || 0;

    const grossPay = base + extraPay;
    const totalDeductionsVal = itemizedDeductions + taxAmount;
    const netPay = grossPay - totalDeductionsVal;

    let payrollRecord = await Payroll.findOneAndUpdate(
      { employee, companyId },
      {
        payperiod: payperiod || 'Current',
        baseSalary: base,
        totalDeductions: totalDeductionsVal,
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

// Get all salary/payroll records and map Net Pay to Current Salary for the dashboard table
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    // 1. Fetch all salaries and populate employees so every employee appears in the table
    const salaries = await Salary.find({ companyId: req.user.companyId })
      .populate('employee', 'name email employeeId department jobTitle');

    // 2. Fetch any existing generated payroll calculations for this company
    const payrollRecords = await Payroll.find({ companyId: req.user.companyId });
    const payrollMap = new Map();
    payrollRecords.forEach(p => payrollMap.set(p.employee.toString(), p));

    // 3. Map salaries to include calculated net pay/payroll data for frontend display
    const enrichedData = salaries.map(sal => {
      const empId = sal.employee?._id?.toString();
      const payrollMatch = empId ? payrollMap.get(empId) : null;

      const base = Number(sal.baseSalary || 0);
      const salaryDeductions = sal.deductions ? sal.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) : 0;
      
      const extras = Number(payrollMatch?.extras || 0);
      const tax = Number(payrollMatch?.tax || 0);
      
      const grossPay = payrollMatch?.grossPay || (base + extras);
      const totalDeductions = payrollMatch?.totalDeductions || (salaryDeductions + tax);
      const netPay = payrollMatch?.netPay || (grossPay - totalDeductions);

      return {
        _id: payrollMatch?._id || sal._id,
        employee: sal.employee,
        baseSalary: netPay, // Sets the table's "Current Salary" column to display the final calculated Net Pay
        rawBaseSalary: base, // Preserves the raw updated base salary from salary configurations
        grossPay,
        totalDeductions,
        netPay,
        status: payrollMatch?.status || 'Unpaid'
      };
    });

    // 4. Calculate overall summary metrics for the top dashboard card
    const summary = enrichedData.reduce((acc, curr) => {
      acc.totalGross += Number(curr.grossPay || 0);
      acc.totalDeductions += Number(curr.totalDeductions || 0);
      acc.totalNet += Number(curr.netPay || 0);
      return acc;
    }, { totalGross: 0, totalDeductions: 0, totalNet: 0 });

    res.status(200).json({
      success: true,
      count: enrichedData.length,
      summary: {
        employeeCount: enrichedData.length,
        totalGrossPay: summary.totalGross,
        totalDeductions: summary.totalDeductions,
        totalNetPay: summary.totalNet
      },
      data: enrichedData
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

// Update or create payroll record by ID or create if missing (Fixes frontend modal save error)
router.patch('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let updatedPayroll = await Payroll.findByIdAndUpdate(id, updates, { 
      new: true, 
      runValidators: true 
    });

    if (!updatedPayroll) {
      updatedPayroll = await Payroll.findOneAndUpdate(
        { employee: id, companyId: req.user.companyId },
        updates,
        { new: true, upsert: true, runValidators: true }
      );
    }

    res.status(200).json({ 
      success: true, 
      message: 'Payroll saved successfully', 
      data: updatedPayroll 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
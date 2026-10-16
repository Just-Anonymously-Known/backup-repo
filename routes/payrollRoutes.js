const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Payroll = require('../models/payroll');
const Salary = require('../models/salary');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Generate or Update Payroll for a single employee OR all employees in the company
router.post('/generate', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employee, payperiod, baseSalary, deductions, tax, extras } = req.body;
    const companyId = req.user.companyId;

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

// Get all employee payroll records
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const employees = await User.find({ companyId, role: { $ne: 'Admin' } }).lean();
    const salaries = await Salary.find({ companyId }).lean();
    const payrollRecords = await Payroll.find({ companyId }).lean();

    const salaryMap = new Map();
    salaries.forEach(s => {
      if (s.employee) salaryMap.set(s.employee.toString(), s);
    });

    const payrollMap = new Map();
    payrollRecords.forEach(p => {
      if (p.employee) payrollMap.set(p.employee.toString(), p);
    });

    const enrichedData = employees.map(emp => {
      const empId = emp._id.toString();
      const salaryMatch = salaryMap.get(empId);
      const payrollMatch = payrollMap.get(empId);

      const base = Number(salaryMatch?.baseSalary || payrollMatch?.baseSalary || 0);
      
      const salaryDeductions = salaryMatch?.deductions && Array.isArray(salaryMatch.deductions) 
        ? salaryMatch.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) 
        : Number(salaryMatch?.deductions || 0);

      const extras = Number(payrollMatch?.extras || 0);
      const tax = Number(payrollMatch?.tax || 0);
      const payrollDeductions = Number(payrollMatch?.totalDeductions || 0);

      const totalDeductions = payrollDeductions > 0 ? payrollDeductions : (salaryDeductions + tax);
      const grossPay = Number(payrollMatch?.grossPay ?? (base + extras));
      const finalCalculatedPay = Number(payrollMatch?.netPay ?? (grossPay - totalDeductions));

      return {
        _id: payrollMatch?._id || salaryMatch?._id || emp._id,
        employee: {
          _id: emp._id,
          name: emp.name,
          email: emp.email,
          employeeId: emp.employeeId || '',
          department: emp.department || 'General',
          jobTitle: emp.jobTitle || emp.role
        },
        baseSalary: finalCalculatedPay,
        currentSalary: finalCalculatedPay,
        netPay: finalCalculatedPay,
        rawBaseSalary: base,
        grossPay,
        totalDeductions,
        payperiod: payrollMatch?.payperiod || 'Current',
        month: payrollMatch?.month || payrollMatch?.payperiod || 'Current',
        status: payrollMatch?.status || 'Unpaid'
      };
    });

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
        totalNetPay: summary.totalNet,
        totalNet: summary.totalNet,
        totalPayroll: summary.totalNet,
        payrollTotal: summary.totalNet
      },
      data: enrichedData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Payroll Payment Status
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

// Update or create payroll record by ID
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
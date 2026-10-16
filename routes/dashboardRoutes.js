const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Leave = require('../models/leave');
const Salary = require('../models/salary');
const Payroll = require('../models/payroll');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get Dashboard Summary Stats (Total Employees, Pending Leaves, Total Payroll)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // 1. Total Employees count
    const totalEmployees = await User.countDocuments({ companyId });

    // 2. Pending Leave requests count
    const pendingLeaves = await Leave.countDocuments({ companyId, status: 'Pending' });

    // 3. Calculate This Month's Payroll total from active Payroll/Salary records
    const payrollRecords = await Payroll.find({ companyId }).lean();
    const salaries = await Salary.find({ companyId }).lean();

    let totalPayrollAmount = 0;

    if (payrollRecords && payrollRecords.length > 0) {
      // If saved payroll records exist, sum their net pay
      totalPayrollAmount = payrollRecords.reduce((sum, p) => sum + (Number(p.netPay) || Number(p.baseSalary) || 0), 0);
    } else if (salaries && salaries.length > 0) {
      // Fallback: Calculate from salary structures if payroll records haven't been generated yet
      totalPayrollAmount = salaries.reduce((sum, sal) => {
        const base = Number(sal.baseSalary) || 0;
        const ded = sal.deductions && Array.isArray(sal.deductions)
          ? sal.deductions.reduce((dSum, d) => dSum + (Number(d.amount) || 0), 0)
          : Number(sal.deductions) || 0;
        return sum + (base - ded);
      }, 0);
    }

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        pendingLeaves,
        totalPayroll: totalPayrollAmount,
        totalNetPay: totalPayrollAmount
      },
      summary: {
        employeeCount: totalEmployees,
        totalNetPay: totalPayrollAmount,
        totalPayroll: totalPayrollAmount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
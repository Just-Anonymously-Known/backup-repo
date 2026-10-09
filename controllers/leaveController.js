const Leave = require('../models/leave');
const Employee = require('../models/user'); // Assuming Employee model is now part of User model

// Apply for leave with automated balance checking and deduction
exports.applyLeave = async (req, res) => {
  try {
    const { employee: employeeId, leaveType, startDate, endDate, reason, companyId } = req.body;

    // 1. Find the employee
    const employeeRecord = await Employee.findById(employeeId);
    if (!employeeRecord) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // 2. Calculate number of days requested
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of start day

    // 3. Check if leave balance is sufficient
    const currentBalance = employeeRecord.leaveBalance[leaveType] || 0;
    if (currentBalance < diffDays) {
      return res.status(400).json({
        success: false,
        error: `Insufficient leave balance. Requested ${diffDays} days, but only ${currentBalance} days remaining for ${leaveType}.`
      });
    }

    // 4. Create the leave request
    const leave = await Leave.create({
  employee: employeeId,
  leaveType,
  startDate,
  endDate,
  reason,
  companyId: companyId || req.user?.companyId
});

    // 5. Deduct from employee balance
    employeeRecord.leaveBalance[leaveType] -= diffDays;
    employeeRecord.markModified('leaveBalance');
    await employeeRecord.save();

    res.status(201).json({
      success: true,
      message: `Leave applied successfully. ${diffDays} days deducted from ${leaveType} balance.`,
      data: leave
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update leave status (Approve/Reject) with automatic balance refunding on rejection
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status, hrComment, companyId } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Use Approved or Rejected' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    // If rejected from a pending state, refund the days back to the employee's balance
    if (status === 'Rejected' && leave.status === 'Pending') {
      const employeeRecord = await Employee.findById(leave.employee);
      if (employeeRecord) {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

       if (employeeRecord.leaveBalance[leave.leaveType] !== undefined) {
      employeeRecord.leaveBalance[leave.leaveType] += diffDays;
      employeeRecord.markModified('leaveBalance');
      await employeeRecord.save();
    }
      }
    }

    leave.status = status;
leave.hrComment = hrComment || leave.hrComment;
if (companyId) leave.companyId = companyId;
await leave.save();

    res.status(200).json({ 
      success: true, 
      message: `Leave request updated to ${status}`, 
      data: leave 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

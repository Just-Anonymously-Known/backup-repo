const Leave = require('../models/leave');

// Apply for leave
exports.applyLeave = async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    const leave = await Leave.create({ 
      employee: employeeId, 
      leaveType, 
      startDate, 
      endDate, 
      reason 
    });
    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update leave status (Approve/Reject)
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status, hrComment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, error: 'Leave request not found' });

    leave.status = status;
    leave.hrComment = hrComment || leave.hrComment;
    await leave.save();

    res.status(200).json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const express = require('express');
const router = express.Router();
const Leave = require('../models/leave'); 
const { applyLeave, updateLeaveStatus } = require('../controllers/leaveController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.post('/', verifyToken, applyLeave);
router.patch('/:id/status', verifyToken, isAdmin, updateLeaveStatus);

// Get all leave requests for the company
router.get('/', verifyToken, async (req, res) => {
  try {
    const leaves = await Leave.find({ companyId: req.user.companyId })
      .populate('employee', 'name email phone gender department') 
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
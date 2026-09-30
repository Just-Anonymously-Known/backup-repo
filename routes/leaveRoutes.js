const express = require('express');
const router = express.Router();
const { applyLeave, updateLeaveStatus } = require('../controllers/leaveController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.post('/', verifyToken, applyLeave);
router.patch('/:id/status', verifyToken, isAdmin, updateLeaveStatus);

module.exports = router;
const express = require('express');
const router = express.Router();
const { sendMessage, getMessages } = require('../controllers/messageController');
const User = require('../models/user');
const Message = require('../models/Message');
const { verifyToken } = require('../middleware/auth');

// Existing routes
router.post('/', verifyToken, sendMessage);
router.get('/', verifyToken, getMessages);

// Dedicated route to message HR automatically
router.post('/to-hr', verifyToken, async (req, res) => {
  try {
    const { subject, content } = req.body;

    if (!content || !subject) {
      return res.status(400).json({ success: false, error: 'Both subject and content are required' });
    }

    const hrUser = await User.findOne({ role: { $in: ['Admin', 'HR'] } });
    if (!hrUser) {
      return res.status(404).json({ success: false, error: 'No HR or Admin account found in the system.' });
    }

    const newMessage = await Message.create({
      sender: req.user.id,
      recipient: hrUser._id,
      subject: subject,
      content: content
    });

    res.status(201).json({ 
      success: true, 
      message: 'Message sent successfully to HR!', 
      data: newMessage 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
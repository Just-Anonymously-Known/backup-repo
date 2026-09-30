const Message = require('../models/Message');

// Send a message or announcement
exports.sendMessage = async (req, res) => {
  try {
    const { recipient, isAnnouncement, subject, content } = req.body;
    const message = await Message.create({
      sender: req.user.id, // comes from the auth middleware we created earlier
      recipient: recipient || null,
      isAnnouncement: isAnnouncement || false,
      subject,
      content
    });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get messages/announcements for the logged-in user
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { recipient: req.user.id }, 
        { isAnnouncement: true }, 
        { sender: req.user.id }
      ]
    }).populate('sender', 'email role');
    
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
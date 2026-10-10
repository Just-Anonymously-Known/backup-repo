const Message = require('../models/Message');

// Send a message or announcement
exports.sendMessage = async (req, res) => {
  try {
    const { recipient, isAnnouncement, subject, content, companyId } = req.body;

    // Ensure the sender is always the currently authenticated user for security
    const newMessage = await Message.create({
      sender: req.user.id,
      recipient: recipient || null,
      isAnnouncement: isAnnouncement || false,
      subject,
      content,
      companyId: companyId || req.user.companyId
    });

    res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
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
const Message = require('../models/Message');

// Send a message or announcement
exports.sendMessage = async (req, res) => {
  try {
    const { recipient, isAnnouncement, subject, content, companyId, sender } = req.body;

    const newMessage = await Message.create({
      sender: sender || req.user?._id || req.user?.id || null,
      recipient: recipient || null,
      isAnnouncement: isAnnouncement || false,
      subject,
      content,
      companyId: companyId || req.user?.companyId || null
    });

    res.status(201).json({ success: true, data: newMessage });
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
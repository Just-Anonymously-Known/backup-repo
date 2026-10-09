const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  addEmployee, 
  updateEmployee, 
  getMe 
} = require('../controllers/authController');

// Routes map cleanly to controller functions
router.post('/register', register);
router.post('/login', login);
router.post('/add-employee', addEmployee);
router.put('/:id', updateEmployee);
router.get('/me', getMe); // Answers Naheejat's question about /api/auth/me

const upload = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/user');

// Route to upload/update profile picture
router.patch('/profile-image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image file.' });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: imagePath },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
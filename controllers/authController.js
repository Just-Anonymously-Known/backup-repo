const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Register User
exports.register = async (req, res) => {
  try {
    const { email, password, role, companyId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
  email,
  password: hashedPassword,
  role: role || 'Employee',
  companyId
});

    res.status(201).json({ success: true, message: 'User registered successfully', data: { email: user.email, role: user.role, companyId: user.companyId } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role, 
        companyId: user.companyId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ success: true, token, role: user.role, companyId: user.companyId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
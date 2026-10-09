const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Register User (Public - Forced to 'Employee' role for security)
exports.register = async (req, res) => {
  try {
    const { email, password, companyId, name, phone, gender, address } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name || '',
      email,
      password: hashedPassword,
      role: 'Employee', // LOCKED: Public users can never register as Admin
      companyId,
      phone: phone || '',
      gender: gender || '',
      address: address || ''
    });

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully', 
      data: { email: user.email, role: user.role, companyId: user.companyId } 
    });
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
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role, 
        companyId: user.companyId 
      },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1d' }
    );

    res.status(200).json({ success: true, token, role: user.role, companyId: user.companyId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Add Employee (Admin Only)
exports.addEmployee = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');

    if (decoded.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Only admins can add employees.' });
    }

    const { name, email, password, role, phone, dateOfBirth, gender, address } = req.body;
    const companyId = decoded.companyId;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'Employee',
      companyId,
      phone: phone || '',
      dateOfBirth: dateOfBirth || null,
      gender: gender || '',
      address: address || ''
    });

    res.status(201).json({ 
      success: true, 
      message: 'Employee added successfully', 
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        phone: user.phone,
        address: user.address,
        gender: user.gender
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Update / Edit Employee or Deactivate (Admin Only)
exports.updateEmployee = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');

    if (decoded.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Only admins can edit employees.' });
    }

    const updatedEmployee = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedEmployee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Employee updated successfully', 
      data: updatedEmployee 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 5. Get Current Logged-in User Profile (/api/auth/me)
exports.getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
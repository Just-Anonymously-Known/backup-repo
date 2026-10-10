const User = require('../models/user');
const Salary = require('../models/salary'); // 1. REQUIRE THE SALARY MODEL AT THE TOP
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Public registration is disabled because employees are created exclusively by admins from the web dashboard.
exports.register = async (req, res) => {
  return res.status(403).json({ 
    success: false, 
    error: 'Public registration is disabled. Please contact your company administrator to create an account.' 
  });
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

   const { 
  name, 
  email, 
  password, 
  role, 
  phone, 
  dateOfBirth, 
  gender, 
  address,
  employeeId,
  department,
  jobTitle,
  employmentType,
  startDate
} = req.body;
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
  address: address || '',
  employeeId: employeeId || '',
  department: department || '',
  jobTitle: jobTitle || '',
  employmentType: employmentType || 'Full-Time',
  startDate: startDate || Date.now()
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
      gender: user.gender,
      employeeId: user.employeeId,
      department: user.department,
      jobTitle: user.jobTitle,
      employmentType: user.employmentType,
      startDate: user.startDate
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

// 5. Get Current Logged-in User Profile & Salary (/api/auth/me)
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

    // 2. FIND THEIR CORRESPONDING SALARY RECORD
    const salaryRecord = await Salary.findOne({ employee: user._id });

    // 3. RETURN BOTH COMBINED SO MAKAN GETS PROFILE & SALARY IN ONE GO
    res.status(200).json({ 
      success: true, 
      data: {
        ...user.toObject(),
        salary: salaryRecord || null 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
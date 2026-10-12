const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// Import Routes
const leaveRoutes = require('./routes/leaveRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const payrollRoutes = require('./routes/payrollRoutes');

// Import models and middleware needed for announcements
const Message = require('./models/Message');
const { verifyToken } = require('./middleware/auth');

// Use Routes
app.use('/api/leaves', leaveRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/payroll', payrollRoutes);

// Direct Announcement Route to match frontend expectation
app.post('/api/announcements', verifyToken, async (req, res) => {
  try {
    const { subject, content, companyId } = req.body;

    const newAnnouncement = await Message.create({
      sender: req.user.id,
      recipient: null,
      isAnnouncement: true,
      subject: subject || 'Announcement',
      content,
      companyId: companyId || req.user.companyId
    });

    res.status(201).json({ 
      success: true, 
      message: 'Announcement sent successfully', 
      data: newAnnouncement 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Route
app.get('/', (req, res) => {
  res.send('HR Tech MVP Backend is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
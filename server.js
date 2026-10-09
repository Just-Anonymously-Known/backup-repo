const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables[span_1](start_span)[span_1](end_span)
dotenv.config();

// Connect to MongoDB[span_2](start_span)[span_2](end_span)
connectDB();

const app = express();

// Middleware[span_3](start_span)[span_3](end_span)
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// Import Routes[span_4](start_span)[span_4](end_span)
const leaveRoutes = require('./routes/leaveRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const payrollRoutes = require('./routes/payrollRoutes');

// Use Routes[span_5](start_span)[span_5](end_span)
app.use('/api/leaves', leaveRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/payroll', payrollRoutes);

// Test Route[span_6](start_span)[span_6](end_span)
app.get('/', (req, res) => {
  res.send('HR Tech MVP Backend is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
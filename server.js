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

// Import Routes
const leaveRoutes = require('./routes/leaveRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Use Routes
app.use('/api/leaves', leaveRoutes);
app.use('/api/messages', messageRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('HR Tech MVP Backend is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
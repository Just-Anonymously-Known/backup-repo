const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true }, // <-- Add this line
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'HR', 'Employee'], default: 'Employee' },
  companyId: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
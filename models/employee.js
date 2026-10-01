const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  department: { type: String, required: true },
  jobTitle: { type: String, required: true },
  employmentType: { type: String, enum: ['Full-Time', 'Part-Time', 'Contract'], default: 'Full-Time' },
  startDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  leaveBalance: {
    Annual: { type: Number, default: 20 },
    Sick: { type: Number, default: 10 },
    Maternity: { type: Number, default: 90 },
    Casual: { type: Number, default: 5 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
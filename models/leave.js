const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  companyId: {
    type: String,
    required: true
  },
  leaveType: { 
    type: String, 
    required: true, 
    enum: ['annual', 'sick', 'maternity', 'paternity', 'unpaid'] 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  hrComment: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  payPeriod: { type: String, required: true }, // e.g., "September 2026"
  baseSalary: { type: Number, required: true },
  totalDeductions: { type: Number, required: true },
  grossPay: { type: Number, required: true },
  netPay: { type: Number, required: true },
  status: { type: String, enum: ['Draft', 'Finalized', 'Paid'], default: 'Draft' },
  paidAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
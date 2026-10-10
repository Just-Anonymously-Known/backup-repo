const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payperiod: { type: String, required: true },
  baseSalary: { type: Number, required: true },
  totalDeductions: { type: Number, required: true },
  grossPay: { type: Number, required: true },
  netPay: { type: Number, required: true },
  status: { type: String, enum: ['Draft', 'Finalized', 'Paid'], default: 'Draft' },
  paymentDate: { type: Date },
  companyId: { type: String, required: true } 
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
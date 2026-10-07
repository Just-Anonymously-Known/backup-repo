const mongoose = require('mongoose');

const deductionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Health Insurance", "Tax"
  amount: { type: Number, required: true }
});

const salarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
  baseSalary: { type: Number, required: true },
  deductions: [deductionSchema],
  paymentFrequency: { type: String, default: 'Monthly' },
  companyId: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Salary', salarySchema);
console.log('Starting admin seed script...');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
require('dotenv').config();

console.log('MONGO_URI loaded:', process.env.MONGO_URI ? 'Yes (hidden)' : 'MISSING!');

const seedAdmin = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas successfully!');

    const hashedPassword = await bcrypt.hash('AdminPassword123', 10);

    const users = [
      {
        name: 'Najeehat (Web Admin)',
        email: 'najeehat@techcrush.com',
        password: hashedPassword,
        role: 'Admin',
        companyId: 'TechCrush',
        employeeId: 'EMP-ADMIN-01',
        department: 'Engineering',
        jobTitle: 'Lead Frontend Developer',
        employmentType: 'Full-Time'
      },
      {
        name: 'Makan (Mobile Dev)',
        email: 'makan@techcrush.com',
        password: hashedPassword,
        role: 'Employee',
        companyId: 'TechCrush',
        employeeId: 'EMP-MOB-01',
        department: 'Engineering',
        jobTitle: 'Mobile Developer',
        employmentType: 'Full-Time'
      }
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`Created user: ${userData.email}`);
      } else {
        existingUser.password = hashedPassword;
        await existingUser.save();
        console.log(`Updated existing user password: ${userData.email}`);
      }
    }

    console.log('Admin seeding complete!');
    process.exit();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedAdmin();
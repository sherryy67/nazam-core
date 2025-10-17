const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');
const ROLES = require('../constants/roles');

// Load environment variables
dotenv.config();

const createFirstAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Check if any admin already exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      console.log('Admin already exists. Skipping creation.');
      process.exit(0);
    }

    // Create first admin
    const adminData = {
      name: 'Super Admin',
      email: 'admin@nazam.com',
      password: 'admin123',
      role: ROLES.ADMIN
    };

    const admin = await Admin.create(adminData);
    console.log('First admin created successfully:');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('Please change the password after first login!');

  } catch (error) {
    console.error('Error creating first admin:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
    process.exit(0);
  }
};

// Run the script
createFirstAdmin();

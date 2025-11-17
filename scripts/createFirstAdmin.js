const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');
const ROLES = require('../constants/roles');

// Load environment variables
dotenv.config();

const createFirstAdmin = async () => {
  try {
    // Connect to database
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI environment variable is not set');
      console.error('Please make sure your .env file contains MONGODB_URI');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });
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

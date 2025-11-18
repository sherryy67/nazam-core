const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    if (error.message.includes('ETIMEOUT') || error.message.includes('queryTxt')) {
      console.error('DNS resolution timeout. Please check:');
      console.error('1. Your internet connection');
      console.error('2. MongoDB Atlas network access settings');
      console.error('3. Firewall/VPN settings that might block MongoDB connections');
    }
    process.exit(1);
  }
};

module.exports = connectDB;

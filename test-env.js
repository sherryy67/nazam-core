#!/usr/bin/env node

// Test script to verify environment variable loading
const dotenv = require('dotenv');

console.log('Testing environment variable loading...\n');

// Load environment variables
dotenv.config();

// Test environment variables
const envVars = [
  'NODE_ENV',
  'PORT',
  'HOST',
  'EC2_PUBLIC_IP',
  'MONGODB_URI',
  'JWT_SECRET'
];

console.log('Environment Variables:');
console.log('=====================');

envVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value || 'NOT SET'}`);
});

console.log('\nSwagger Server URL Test:');
console.log('========================');

const isProduction = process.env.NODE_ENV === 'production';
const serverUrl = isProduction
  ? `http://${process.env.HOST || process.env.EC2_PUBLIC_IP || "18.215.151.243"}:${process.env.PORT || 3001}`
  : `http://localhost:${process.env.PORT || 3001}`;

console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Server URL: ${serverUrl}`);
console.log(`Is Production: ${isProduction}`);

console.log('\nTest completed successfully!');

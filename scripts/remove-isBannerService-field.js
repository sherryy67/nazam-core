const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Service = require('../models/Service');

// Load environment variables
dotenv.config();

/**
 * Migration script to remove isBannerService field from all services in the database
 * This script will:
 * 1. Connect to the database
 * 2. Find all services that have the isBannerService field
 * 3. Remove the field from all documents using $unset
 * 4. Report the results
 */
const removeIsBannerServiceField = async () => {
  try {
    // Connect to database
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI environment variable is not set');
      console.error('Please make sure your .env file contains MONGODB_URI');
      process.exit(1);
    }
    
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });
    console.log('✓ Connected to database');

    // Count services with isBannerService field
    const servicesWithField = await Service.countDocuments({
      isBannerService: { $exists: true }
    });

    console.log(`\nFound ${servicesWithField} services with isBannerService field`);

    if (servicesWithField === 0) {
      console.log('No services need updating. The isBannerService field does not exist in any services.');
      process.exit(0);
    }

    // Remove the isBannerService field from all services
    console.log('\nRemoving isBannerService field from all services...');
    const updateResult = await Service.updateMany(
      { isBannerService: { $exists: true } },
      { $unset: { isBannerService: "" } }
    );

    console.log(`✓ Successfully removed isBannerService field from ${updateResult.modifiedCount} service(s)`);
    console.log(`  - Matched: ${updateResult.matchedCount} service(s)`);
    console.log(`  - Modified: ${updateResult.modifiedCount} service(s)`);

    // Verify the removal
    const remainingServices = await Service.countDocuments({
      isBannerService: { $exists: true }
    });

    if (remainingServices === 0) {
      console.log('\n✓ Migration completed successfully. All isBannerService fields have been removed.');
    } else {
      console.warn(`\n⚠ Warning: ${remainingServices} service(s) still have the isBannerService field.`);
    }

  } catch (error) {
    console.error('\n✗ Error removing isBannerService field:', error.message);
    if (error.message.includes('ETIMEOUT') || error.message.includes('queryTxt')) {
      console.error('\n⚠ DNS resolution timeout. Please check:');
      console.error('1. Your internet connection');
      console.error('2. MongoDB Atlas network access settings');
      console.error('3. Firewall/VPN settings that might block MongoDB connections');
      console.error('4. Try again in a few moments if the issue persists');
    } else {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from database');
    process.exit(0);
  }
};

// Run the script
console.log('='.repeat(60));
console.log('Migration: Remove isBannerService Field from Services');
console.log('='.repeat(60));
removeIsBannerServiceField();


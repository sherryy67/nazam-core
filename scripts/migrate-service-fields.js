const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Service = require('../models/Service');

// Load environment variables
dotenv.config();

const migrateServiceFields = async () => {
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

    // Find all services that don't have serviceType or isBannerService
    const servicesToUpdate = await Service.find({
      $or: [
        { serviceType: { $exists: false } },
        { isBannerService: { $exists: false } }
      ]
    });

    console.log(`Found ${servicesToUpdate.length} services to update`);

    if (servicesToUpdate.length === 0) {
      console.log('No services need updating. All services already have serviceType and isBannerService fields.');
      process.exit(0);
    }

    // Update services with default values
    const updateResult = await Service.updateMany(
      {
        $or: [
          { serviceType: { $exists: false } },
          { isBannerService: { $exists: false } }
        ]
      },
      {
        $set: {
          serviceType: 'residential',
          isBannerService: false
        }
      }
    );

    console.log(`Successfully updated ${updateResult.modifiedCount} services`);
    console.log('Default values applied:');
    console.log('  - serviceType: "residential"');
    console.log('  - isBannerService: false');

    // Verify the update
    const remainingServices = await Service.find({
      $or: [
        { serviceType: { $exists: false } },
        { isBannerService: { $exists: false } }
      ]
    });

    if (remainingServices.length === 0) {
      console.log('✓ Migration completed successfully. All services now have serviceType and isBannerService fields.');
    } else {
      console.warn(`⚠ Warning: ${remainingServices.length} services still missing fields.`);
    }

  } catch (error) {
    console.error('Error migrating service fields:', error.message);
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
    console.log('Disconnected from database');
    process.exit(0);
  }
};

// Run the script
migrateServiceFields();


/**
 * Migration script to add subServices field to existing Service documents
 * This ensures all existing services have an empty subServices array for consistency
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Service = require('../models/Service');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

const migrateServices = async () => {
  try {
    console.log('\n🔄 Starting migration: Adding subServices field to existing services...\n');

    // Find all services that don't have subServices field or have it as null/undefined
    const servicesWithoutSubServices = await Service.find({
      $or: [
        { subServices: { $exists: false } },
        { subServices: null },
        { subServices: { $eq: [] } } // This will also match empty arrays, but that's fine
      ]
    });

    console.log(`📊 Found ${servicesWithoutSubServices.length} services without subServices field`);

    if (servicesWithoutSubServices.length === 0) {
      console.log('✅ All services already have subServices field. No migration needed.');
      return;
    }

    // Update all services to have an empty subServices array
    const result = await Service.updateMany(
      {
        $or: [
          { subServices: { $exists: false } },
          { subServices: null }
        ]
      },
      {
        $set: { subServices: [] }
      }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} service(s) with empty subServices array`);
    console.log(`📝 Matched: ${result.matchedCount} service(s)`);

    // Verify the migration
    const remainingServices = await Service.find({
      $or: [
        { subServices: { $exists: false } },
        { subServices: null }
      ]
    }).countDocuments();

    if (remainingServices === 0) {
      console.log('✅ Migration completed successfully! All services now have subServices field.');
    } else {
      console.log(`⚠️  Warning: ${remainingServices} service(s) still missing subServices field`);
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

// Main function
const runMigration = async () => {
  try {
    await connectDB();
    await migrateServices();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateServices };


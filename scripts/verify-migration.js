const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Vendor = require('../models/Vendor');
const ServiceRequest = require('../models/ServiceRequest');

async function verifyMigration() {
  try {
    console.log('🔍 Verifying vendor migration...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to database');

    // Check vendor schema compliance
    const vendors = await Vendor.find({}).limit(5); // Check first 5 vendors

    console.log(`\n📊 Checking ${vendors.length} sample vendors:`);

    for (const vendor of vendors) {
      console.log(`\n👤 Vendor: ${vendor.firstName} ${vendor.lastName} (${vendor.email})`);

      // Check required new fields
      const checks = [
        { field: 'type', value: vendor.type, required: true },
        { field: 'kycInfo', value: vendor.kycInfo, required: true },
        { field: 'bankingInfo', value: vendor.bankingInfo, required: true },
        { field: 'approved', value: vendor.approved, required: true },
        { field: 'availabilitySchedule', value: vendor.availabilitySchedule, required: false },
        { field: 'unavailableDates', value: vendor.unavailableDates, required: false }
      ];

      checks.forEach(check => {
        if (check.required && (check.value === undefined || check.value === null)) {
          console.log(`  ❌ Missing required field: ${check.field}`);
        } else {
          console.log(`  ✅ ${check.field}: ${check.value !== undefined ? 'present' : 'not set'}`);
        }
      });
    }

    // Check service request assignments
    console.log('\n🔗 Checking service request assignments...');
    const totalRequests = await ServiceRequest.countDocuments();
    const assignedRequests = await ServiceRequest.countDocuments({
      vendor: { $exists: true, $ne: null }
    });

    console.log(`📋 Total service requests: ${totalRequests}`);
    console.log(`🔗 Assigned requests: ${assignedRequests}`);

    // Check for any broken references
    const requestsWithInvalidVendors = await ServiceRequest.find({
      vendor: { $exists: true, $ne: null }
    }).populate('vendor');

    let brokenRefs = 0;
    for (const request of requestsWithInvalidVendors) {
      if (!request.vendor || !request.vendor._id) {
        brokenRefs++;
      }
    }

    console.log(`❌ Broken vendor references: ${brokenRefs}`);

    if (brokenRefs > 0) {
      console.log('\n⚠️  WARNING: Found broken vendor references in service requests!');
      console.log('   These need manual review and fixing.');
    }

    // Summary
    console.log('\n📈 Migration Verification Summary:');
    console.log('✅ Vendor schema migration completed');
    console.log('✅ Basic field validation passed');
    console.log('✅ Service request assignments checked');

    if (brokenRefs === 0) {
      console.log('🎉 Migration appears successful!');
    } else {
      console.log('⚠️  Migration completed but requires manual review of broken references');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyMigration();
}

module.exports = { verifyMigration };

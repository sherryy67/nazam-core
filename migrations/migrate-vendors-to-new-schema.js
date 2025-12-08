const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Vendor = require('../models/Vendor');
const ServiceRequest = require('../models/ServiceRequest');

async function migrateVendorsToNewSchema() {
  try {
    console.log('🚀 Starting vendor migration to new schema...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to database');

    // Get all existing vendors
    const existingVendors = await Vendor.find({});
    console.log(`📊 Found ${existingVendors.length} existing vendors to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const vendor of existingVendors) {
      try {
        // Check if vendor already has new schema fields
        if (vendor.type && vendor.kycInfo && vendor.bankingInfo) {
          console.log(`⏭️  Vendor ${vendor.email} already migrated, skipping...`);
          continue;
        }

        console.log(`🔄 Migrating vendor: ${vendor.firstName} ${vendor.lastName} (${vendor.email})`);

        // Prepare migration data
        const migrationData = {
          // Set default type if not set
          type: vendor.type || 'individual',

          // Migrate existing banking fields to new structure
          bankingInfo: {
            bankName: vendor.bankName || null,
            branchName: vendor.branchName || null,
            bankAccountNumber: vendor.bankAccountNumber || null,
            iban: vendor.iban || null,
            vatRegistration: vendor.vatRegistration || false,
            collectTax: vendor.collectTax || false,
            bankingVerified: false // Require re-verification
          },

          // Initialize KYC info
          kycInfo: {
            idType: vendor.idType || 'Passport', // Default fallback
            idNumber: vendor.idNumber || '',
            personalIdNumber: vendor.personalIdNumber || null,
            kycStatus: 'pending', // Require KYC submission
            kycSubmittedAt: null,
            kycVerifiedAt: null,
            kycVerifiedBy: null,
            kycRejectionReason: null
          },

          // Initialize availability schedule (empty for now)
          availabilitySchedule: vendor.availabilitySchedule || [],

          // Migrate unavailable dates
          unavailableDates: vendor.unavailableDates || [],

          // Set default approval status for existing vendors
          approved: vendor.approved !== undefined ? vendor.approved : true, // Assume existing vendors are approved

          // Initialize active status (existing vendors are active by default)
          active: true,
          inactiveReason: null,
          inactiveAt: null,

          // Initialize block status
          blocked: false,
          blockedReason: null,
          blockedAt: null,
          blockedBy: null
        };

        // Update vendor with new schema fields
        await Vendor.findByIdAndUpdate(vendor._id, migrationData, {
          new: true,
          runValidators: false // Skip validation during migration
        });

        migratedCount++;
        console.log(`✅ Successfully migrated vendor: ${vendor.email}`);

      } catch (vendorError) {
        console.error(`❌ Error migrating vendor ${vendor.email}:`, vendorError.message);
        errorCount++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount} vendors`);
    console.log(`❌ Errors: ${errorCount} vendors`);

    // Check service requests
    console.log('\n🔍 Checking service requests...');
    const serviceRequestsWithVendors = await ServiceRequest.find({
      vendor: { $exists: true, $ne: null }
    }).populate('vendor');

    console.log(`📋 Found ${serviceRequestsWithVendors.length} service requests with vendor assignments`);

    let validAssignments = 0;
    let invalidAssignments = 0;

    for (const request of serviceRequestsWithVendors) {
      if (request.vendor && request.vendor._id) {
        validAssignments++;
      } else {
        invalidAssignments++;
        console.log(`⚠️  Service request ${request._id} has invalid vendor reference`);
      }
    }

    console.log(`✅ Valid vendor assignments: ${validAssignments}`);
    console.log(`❌ Invalid vendor assignments: ${invalidAssignments}`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Review migrated vendors in admin panel');
    console.log('2. Ask existing vendors to submit KYC documents');
    console.log('3. Verify banking information for existing vendors');
    console.log('4. Set up availability schedules for vendors');
    console.log('5. Test the new vendor management features');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateVendorsToNewSchema();
}

module.exports = { migrateVendorsToNewSchema };

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Vendor = require('../models/Vendor');
const Company = require('../models/Company');
const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const User = require('../models/User');

async function resetStagingData() {
  try {
    console.log('🧹 Starting staging data reset...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to database');

    // Confirm this is staging environment
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ ERROR: This script should NOT be run in production!');
      console.error('   Use NODE_ENV=staging to run this script');
      process.exit(1);
    }

    console.log('⚠️  Environment confirmed as non-production, proceeding...');

    // Get counts before deletion
    const vendorCount = await Vendor.countDocuments();
    const companyCount = await Company.countDocuments();
    const serviceRequestCount = await ServiceRequest.countDocuments();
    const userCount = await User.countDocuments();

    console.log(`\n📊 Current data counts:`);
    console.log(`   Vendors: ${vendorCount}`);
    console.log(`   Companies: ${companyCount}`);
    console.log(`   Service Requests: ${serviceRequestCount}`);
    console.log(`   Users: ${userCount}`);

    // Ask for confirmation (in a real script, you'd want user input)
    console.log('\n🗑️  Deleting all vendor and service request data...');

    // Delete in correct order (respecting foreign keys)
    const deleteResults = await Promise.all([
      ServiceRequest.deleteMany({}),
      Vendor.deleteMany({}),
      Company.deleteMany({}),
      // Keep services and users intact, just remove vendor-related data
    ]);

    console.log('\n✅ Deletion results:');
    console.log(`   Service Requests deleted: ${deleteResults[0].deletedCount}`);
    console.log(`   Vendors deleted: ${deleteResults[1].deletedCount}`);
    console.log(`   Companies deleted: ${deleteResults[2].deletedCount}`);

    // Verify clean slate
    const finalCounts = await Promise.all([
      Vendor.countDocuments(),
      Company.countDocuments(),
      ServiceRequest.countDocuments()
    ]);

    console.log('\n🎯 Final counts (should all be 0):');
    console.log(`   Vendors: ${finalCounts[0]}`);
    console.log(`   Companies: ${finalCounts[1]}`);
    console.log(`   Service Requests: ${finalCounts[2]}`);

    if (finalCounts[0] === 0 && finalCounts[1] === 0 && finalCounts[2] === 0) {
      console.log('\n🎉 Staging data reset successful!');
      console.log('\n📝 Next steps:');
      console.log('1. Create test admin account');
      console.log('2. Create test vendors (individual and corporate)');
      console.log('3. Test KYC submission workflow');
      console.log('4. Test banking verification');
      console.log('5. Test service assignments');
      console.log('6. Test availability management');
    } else {
      console.log('\n⚠️  Some data may still remain. Check manually.');
    }

  } catch (error) {
    console.error('💥 Reset failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run reset if this file is executed directly
if (require.main === module) {
  // Safety check - only run if explicitly confirmed
  const args = process.argv.slice(2);
  if (args.includes('--confirm')) {
    resetStagingData();
  } else {
    console.log('🛡️  Safety Check: This will DELETE ALL vendor and service request data!');
    console.log('   Run with --confirm flag to proceed:');
    console.log('   node scripts/reset-staging-data.js --confirm');
    process.exit(0);
  }
}

module.exports = { resetStagingData };

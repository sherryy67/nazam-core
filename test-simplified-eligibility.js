/**
 * Test script to verify the simplified eligibility logic
 */

const mongoose = require('mongoose');
const Service = require('./models/Service');
const Vendor = require('./models/Vendor');
const { checkVendorEligibility } = require('./utils/vendorEligibility');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nazam-core', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test the simplified eligibility
const testSimplifiedEligibility = async () => {
  try {
    console.log('\n🧪 Testing simplified eligibility logic...');

    const vendorId = '6901036683b0ef863b12b16d';
    const serviceId = '68fcdf1652f7d1dd9d2b9929';

    // Find vendor
    const vendor = await Vendor.findById(vendorId)
      .populate('serviceId', 'name description category_id');

    if (!vendor) {
      console.log('❌ Vendor not found');
      return;
    }

    // Find service
    const service = await Service.findById(serviceId)
      .populate('category_id', 'name description');

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('\n📊 Test Data:');
    console.log('  - Vendor:', `${vendor.firstName} ${vendor.lastName}`);
    console.log('  - Vendor Approved:', vendor.approved);
    console.log('  - Service:', service.name);
    console.log('  - Service Type:', service.job_service_type);
    console.log('  - Service Category:', service.category_id?.name);
    console.log('  - Vendor Service Category:', vendor.serviceId?.category_id?.name);

    // Test eligibility
    console.log('\n🎯 Testing eligibility...');
    const isEligible = checkVendorEligibility(vendor, service);
    console.log('  - Result:', isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE');

    if (isEligible) {
      console.log('\n🎉 SUCCESS! The vendor should now appear in the eligible vendors list.');
      console.log('   - Category matching is no longer required');
      console.log('   - Only approval status and availability are checked');
    } else {
      console.log('\n❌ Still not eligible. Let\'s check why...');
      
      if (!vendor.approved) {
        console.log('   - Vendor is not approved');
      }
      
      if (service.job_service_type === 'Scheduled' && service.scheduledDate && service.scheduledTime) {
        console.log('   - This is a scheduled service, checking time availability...');
        const serviceDate = new Date(service.scheduledDate);
        const dayOfWeek = serviceDate.toLocaleDateString('en-US', { weekday: 'short' });
        const daySchedule = vendor.availabilitySchedule.find(schedule => 
          schedule.dayOfWeek === dayOfWeek
        );
        
        if (!daySchedule) {
          console.log('   - No availability schedule for', dayOfWeek);
        } else {
          console.log('   - Day schedule found for', dayOfWeek);
        }
      } else {
        console.log('   - This is not a scheduled service, checking general availability...');
        console.log('   - Vendor availability schedule entries:', vendor.availabilitySchedule?.length || 0);
      }
    }

  } catch (error) {
    console.error('❌ Error testing eligibility:', error);
  }
};

// Main function
const runTest = async () => {
  try {
    await connectDB();
    await testSimplifiedEligibility();
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runTest();
}

module.exports = { runTest };

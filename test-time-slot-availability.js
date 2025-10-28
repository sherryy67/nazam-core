/**
 * Test script to verify the time slot availability check
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

// Test the time slot availability check
const testTimeSlotAvailability = async () => {
  try {
    console.log('\n🧪 Testing time slot availability check...');

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
    console.log('  - Vendor Availability Schedule:', vendor.availabilitySchedule?.length || 0, 'entries');

    if (vendor.availabilitySchedule && vendor.availabilitySchedule.length > 0) {
      console.log('  - Availability Details:');
      vendor.availabilitySchedule.forEach((schedule, index) => {
        console.log(`    ${index + 1}. ${schedule.dayOfWeek}: ${schedule.startTime} - ${schedule.endTime}`);
      });
    }

    // Test eligibility
    console.log('\n🎯 Testing eligibility (time slots only):');
    const isEligible = checkVendorEligibility(vendor, service);
    console.log('  - Result:', isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE');

    if (isEligible) {
      console.log('\n🎉 SUCCESS! The vendor is eligible based on time slot availability.');
      console.log('   - Only checking vendor approval and availability schedule');
      console.log('   - No category matching required');
      console.log('   - No service type restrictions');
    } else {
      console.log('\n❌ Not eligible. Reasons:');
      
      if (!vendor.approved) {
        console.log('   - Vendor is not approved');
      }
      
      if (service.job_service_type === 'Scheduled' && service.scheduledDate && service.scheduledTime) {
        console.log('   - This is a scheduled service, checking specific time availability...');
        const serviceDate = new Date(service.scheduledDate);
        const dayOfWeek = serviceDate.toLocaleDateString('en-US', { weekday: 'short' });
        const daySchedule = vendor.availabilitySchedule.find(schedule => 
          schedule.dayOfWeek === dayOfWeek
        );
        
        if (!daySchedule) {
          console.log('   - No availability for', dayOfWeek);
        } else {
          console.log('   - Available on', dayOfWeek, 'from', daySchedule.startTime, 'to', daySchedule.endTime);
          console.log('   - Service scheduled for', service.scheduledTime);
        }
      } else {
        console.log('   - This is not a scheduled service');
        console.log('   - Vendor has', vendor.availabilitySchedule?.length || 0, 'availability entries');
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
    await testTimeSlotAvailability();
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

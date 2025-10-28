/**
 * Test script to verify the vendor eligibility fix
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

// Test the specific vendor from the user's data
const testVendorEligibilityFix = async () => {
  try {
    console.log('\n🧪 Testing vendor eligibility fix...');

    const vendorId = '6900ff5dd3afe11599da9389';
    const serviceId = '68fcdf1652f7d1dd9d2b9929';

    // Find vendor with populated serviceId
    const vendor = await Vendor.findById(vendorId)
      .populate('serviceId', 'name description category_id');

    if (!vendor) {
      console.log('❌ Vendor not found');
      return;
    }

    console.log('✅ Vendor found:', {
      _id: vendor._id,
      firstName: vendor.firstName,
      lastName: vendor.lastName,
      serviceId: vendor.serviceId?._id,
      approved: vendor.approved,
      availabilitySchedule: vendor.availabilitySchedule
    });

    // Find service with populated category
    const service = await Service.findById(serviceId)
      .populate('category_id', 'name description');

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('✅ Service found:', {
      _id: service._id,
      name: service.name,
      category_id: service.category_id?._id,
      job_service_type: service.job_service_type,
      scheduledDate: service.scheduledDate,
      scheduledTime: service.scheduledTime
    });

    // Test eligibility
    console.log('\n🔍 Testing eligibility...');
    const isEligible = checkVendorEligibility(vendor, service);
    
    console.log('Eligibility result:', isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE');

    // If vendor has empty availabilitySchedule, update it with default
    if (!vendor.availabilitySchedule || vendor.availabilitySchedule.length === 0) {
      console.log('\n🔧 Updating vendor with default availability schedule...');
      
      const defaultSchedule = [
        { dayOfWeek: 'Mon', startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 'Tue', startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 'Wed', startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 'Thu', startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 'Fri', startTime: '09:00', endTime: '18:00' }
      ];

      await Vendor.findByIdAndUpdate(
        vendor._id,
        { availabilitySchedule: defaultSchedule },
        { new: true }
      );

      console.log('✅ Vendor updated with default schedule');

      // Test eligibility again
      const updatedVendor = await Vendor.findById(vendorId)
        .populate('serviceId', 'name description category_id');
      
      const isEligibleAfterUpdate = checkVendorEligibility(updatedVendor, service);
      console.log('Eligibility after update:', isEligibleAfterUpdate ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE');
    }

  } catch (error) {
    console.error('❌ Error testing vendor:', error);
  }
};

// Main function
const runTest = async () => {
  try {
    await connectDB();
    await testVendorEligibilityFix();
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

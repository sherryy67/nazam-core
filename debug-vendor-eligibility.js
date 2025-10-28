/**
 * Debug script for vendor eligibility issue
 * This script tests the specific vendor and service from the user's data
 */

const mongoose = require('mongoose');
const Service = require('./models/Service');
const Vendor = require('./models/Vendor');
const Category = require('./models/Category');
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

// Test the specific vendor and service
const testSpecificVendor = async () => {
  try {
    console.log('\n🔍 Testing specific vendor eligibility...');

    // Find the vendor by ID
    const vendorId = '6900ff5dd3afe11599da9389';
    const serviceId = '68fcdf1652f7d1dd9d2b9929';

    console.log(`Looking for vendor: ${vendorId}`);
    console.log(`Looking for service: ${serviceId}`);

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
      serviceId: vendor.serviceId,
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
      category_id: service.category_id,
      job_service_type: service.job_service_type,
      scheduledDate: service.scheduledDate,
      scheduledTime: service.scheduledTime,
      isAssigned: service.isAssigned,
      vendorId: service.vendorId
    });

    // Test eligibility
    console.log('\n🧪 Testing eligibility...');
    const isEligible = checkVendorEligibility(vendor, service);
    
    console.log('Eligibility result:', isEligible);

    // Detailed breakdown
    console.log('\n📊 Detailed analysis:');
    console.log('1. Vendor approved:', vendor.approved);
    console.log('2. Vendor serviceId:', vendor.serviceId?._id);
    console.log('3. Service category_id:', service.category_id?._id);
    console.log('4. Category match:', vendor.serviceId?.category_id?.toString() === service.category_id?.toString());
    console.log('5. Service type:', service.job_service_type);
    console.log('6. Has scheduled date/time:', !!(service.scheduledDate && service.scheduledTime));
    console.log('7. Vendor availability schedule:', vendor.availabilitySchedule);

    if (service.job_service_type === "Scheduled" && service.scheduledDate && service.scheduledTime) {
      const serviceDate = new Date(service.scheduledDate);
      const dayOfWeek = serviceDate.toLocaleDateString('en-US', { weekday: 'short' });
      console.log('8. Service day of week:', dayOfWeek);
      console.log('9. Service time:', service.scheduledTime);
      
      const daySchedule = vendor.availabilitySchedule.find(schedule => 
        schedule.dayOfWeek === dayOfWeek
      );
      console.log('10. Day schedule found:', daySchedule);
    }

  } catch (error) {
    console.error('❌ Error testing vendor:', error);
  }
};

// Main function
const runDebug = async () => {
  try {
    await connectDB();
    await testSpecificVendor();
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runDebug();
}

module.exports = { runDebug };

/**
 * Debug script to check why the vendor is not appearing in eligible vendors
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

// Debug the specific vendor and service
const debugEligibility = async () => {
  try {
    console.log('\n🔍 Debugging vendor eligibility...');

    const vendorId = '6901036683b0ef863b12b16d';
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

    console.log('\n✅ Vendor found:');
    console.log('  - ID:', vendor._id);
    console.log('  - Name:', `${vendor.firstName} ${vendor.lastName}`);
    console.log('  - Approved:', vendor.approved);
    console.log('  - ServiceId:', vendor.serviceId?._id);
    console.log('  - ServiceId populated:', !!vendor.serviceId);
    console.log('  - Availability Schedule:', vendor.availabilitySchedule?.length || 0, 'entries');

    // Find service with populated category
    const service = await Service.findById(serviceId)
      .populate('category_id', 'name description');

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('\n✅ Service found:');
    console.log('  - ID:', service._id);
    console.log('  - Name:', service.name);
    console.log('  - Category ID:', service.category_id?._id);
    console.log('  - Category populated:', !!service.category_id);
    console.log('  - Job Service Type:', service.job_service_type);
    console.log('  - Scheduled Date:', service.scheduledDate);
    console.log('  - Scheduled Time:', service.scheduledTime);
    console.log('  - Is Assigned:', service.isAssigned);
    console.log('  - Vendor ID:', service.vendorId);

    // Check category matching
    console.log('\n🔍 Category Matching:');
    console.log('  - Vendor service category:', vendor.serviceId?.category_id?._id);
    console.log('  - Service category:', service.category_id?._id);
    console.log('  - Categories match:', vendor.serviceId?.category_id?.toString() === service.category_id?.toString());

    // Test eligibility step by step
    console.log('\n🧪 Testing eligibility step by step:');
    
    // Step 1: Check if vendor is approved
    const isApproved = vendor.approved;
    console.log('  1. Vendor approved:', isApproved ? '✅' : '❌');

    // Step 2: Check category matching
    const hasMatchingCategory = vendor.serviceId && vendor.serviceId.category_id && 
                               vendor.serviceId.category_id.toString() === service.category_id.toString();
    console.log('  2. Category match:', hasMatchingCategory ? '✅' : '❌');

    // Step 3: Check if service is scheduled
    const isScheduled = service.job_service_type === "Scheduled" && service.scheduledDate && service.scheduledTime;
    console.log('  3. Service is scheduled:', isScheduled ? '✅' : '❌');

    if (isScheduled) {
      console.log('     - Scheduled Date:', service.scheduledDate);
      console.log('     - Scheduled Time:', service.scheduledTime);
      
      // Check availability for scheduled service
      const serviceDate = new Date(service.scheduledDate);
      const dayOfWeek = serviceDate.toLocaleDateString('en-US', { weekday: 'short' });
      console.log('     - Day of week:', dayOfWeek);
      
      const daySchedule = vendor.availabilitySchedule.find(schedule => 
        schedule.dayOfWeek === dayOfWeek
      );
      console.log('     - Day schedule found:', daySchedule ? '✅' : '❌');
      
      if (daySchedule) {
        console.log('     - Start time:', daySchedule.startTime);
        console.log('     - End time:', daySchedule.endTime);
        console.log('     - Service time:', service.scheduledTime);
      }
    }

    // Test the actual eligibility function
    console.log('\n🎯 Final eligibility test:');
    const isEligible = checkVendorEligibility(vendor, service);
    console.log('  Result:', isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE');

    // If not eligible, let's check what's wrong
    if (!isEligible) {
      console.log('\n🔍 Debugging why not eligible:');
      
      if (!isApproved) {
        console.log('  - Vendor is not approved');
      }
      
      if (!hasMatchingCategory) {
        console.log('  - Category mismatch');
        console.log('    - Vendor service category:', vendor.serviceId?.category_id);
        console.log('    - Service category:', service.category_id);
      }
      
      if (isScheduled) {
        const serviceDate = new Date(service.scheduledDate);
        const dayOfWeek = serviceDate.toLocaleDateString('en-US', { weekday: 'short' });
        const daySchedule = vendor.availabilitySchedule.find(schedule => 
          schedule.dayOfWeek === dayOfWeek
        );
        
        if (!daySchedule) {
          console.log('  - No availability schedule for', dayOfWeek);
        } else {
          // Check time range
          const serviceTime = service.scheduledTime;
          const startTime = daySchedule.startTime;
          const endTime = daySchedule.endTime;
          
          console.log('  - Time check:');
          console.log('    - Service time:', serviceTime);
          console.log('    - Available from:', startTime);
          console.log('    - Available until:', endTime);
          
          // Simple time comparison
          const serviceMinutes = parseInt(serviceTime.split(':')[0]) * 60 + parseInt(serviceTime.split(':')[1]);
          const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
          const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
          
          const timeInRange = serviceMinutes >= startMinutes && serviceMinutes <= endMinutes;
          console.log('    - Time in range:', timeInRange ? '✅' : '❌');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging:', error);
  }
};

// Main function
const runDebug = async () => {
  try {
    await connectDB();
    await debugEligibility();
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

/**
 * Quick script to check the service data
 */

const mongoose = require('mongoose');
const Service = require('./models/Service');
const Vendor = require('./models/Vendor');

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

// Check the service
const checkService = async () => {
  try {
    const serviceId = '68fcdf1652f7d1dd9d2b9929';
    
    console.log(`\n🔍 Checking service: ${serviceId}`);
    
    const service = await Service.findById(serviceId)
      .populate('category_id', 'name description');
    
    if (!service) {
      console.log('❌ Service not found');
      return;
    }
    
    console.log('✅ Service found:');
    console.log('  - Name:', service.name);
    console.log('  - Job Service Type:', service.job_service_type);
    console.log('  - Category:', service.category_id?.name);
    console.log('  - Scheduled Date:', service.scheduledDate);
    console.log('  - Scheduled Time:', service.scheduledTime);
    console.log('  - Is Assigned:', service.isAssigned);
    console.log('  - Vendor ID:', service.vendorId);
    console.log('  - Is Active:', service.isActive);
    
    // Check if it's a scheduled service
    if (service.job_service_type === 'Scheduled') {
      console.log('\n📅 This is a scheduled service:');
      console.log('  - Has scheduledDate:', !!service.scheduledDate);
      console.log('  - Has scheduledTime:', !!service.scheduledTime);
      
      if (!service.scheduledDate || !service.scheduledTime) {
        console.log('❌ PROBLEM: Scheduled service is missing scheduledDate or scheduledTime!');
        console.log('   This service needs to be updated with a date and time.');
      }
    } else {
      console.log('\n📅 This is NOT a scheduled service, so it will use general availability check.');
    }
    
  } catch (error) {
    console.error('❌ Error checking service:', error);
  }
};

// Check vendors
const checkVendors = async () => {
  try {
    console.log('\n🔍 Checking vendors...');
    
    const vendors = await Vendor.find({ approved: true })
      .populate('serviceId', 'name description category_id')
      .select('-password');
    
    console.log(`Found ${vendors.length} approved vendors:`);
    
    vendors.forEach((vendor, index) => {
      console.log(`\n${index + 1}. ${vendor.firstName} ${vendor.lastName}`);
      console.log('   - ID:', vendor._id);
      console.log('   - Service ID:', vendor.serviceId?._id);
      console.log('   - Service Category:', vendor.serviceId?.category_id?.name);
      console.log('   - Availability Schedule:', vendor.availabilitySchedule?.length || 0, 'entries');
      console.log('   - Approved:', vendor.approved);
    });
    
  } catch (error) {
    console.error('❌ Error checking vendors:', error);
  }
};

// Main function
const runCheck = async () => {
  try {
    await connectDB();
    await checkService();
    await checkVendors();
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runCheck();
}

module.exports = { runCheck };

/**
 * Script to update a service with scheduled date and time
 */

const mongoose = require('mongoose');
const Service = require('./models/Service');

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

// Update the service with scheduled date and time
const updateService = async () => {
  try {
    const serviceId = '68fcdf1652f7d1dd9d2b9929';
    
    console.log(`\n🔧 Updating service: ${serviceId}`);
    
    // Check current service
    const currentService = await Service.findById(serviceId);
    if (!currentService) {
      console.log('❌ Service not found');
      return;
    }
    
    console.log('Current service:');
    console.log('  - Name:', currentService.name);
    console.log('  - Job Service Type:', currentService.job_service_type);
    console.log('  - Scheduled Date:', currentService.scheduledDate);
    console.log('  - Scheduled Time:', currentService.scheduledTime);
    
    // Update with scheduled date and time
    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      {
        job_service_type: 'Scheduled',
        scheduledDate: new Date('2025-10-28'), // Tomorrow
        scheduledTime: '14:00', // 2 PM
        isAssigned: false,
        vendorId: null
      },
      { new: true, runValidators: true }
    ).populate('category_id', 'name description');
    
    console.log('\n✅ Service updated:');
    console.log('  - Name:', updatedService.name);
    console.log('  - Job Service Type:', updatedService.job_service_type);
    console.log('  - Scheduled Date:', updatedService.scheduledDate);
    console.log('  - Scheduled Time:', updatedService.scheduledTime);
    console.log('  - Is Assigned:', updatedService.isAssigned);
    console.log('  - Category:', updatedService.category_id?.name);
    
    console.log('\n🎉 Service is now ready for vendor assignment!');
    
  } catch (error) {
    console.error('❌ Error updating service:', error);
  }
};

// Main function
const runUpdate = async () => {
  try {
    await connectDB();
    await updateService();
  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runUpdate();
}

module.exports = { runUpdate };

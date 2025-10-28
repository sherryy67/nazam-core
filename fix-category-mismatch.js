/**
 * Script to fix the category mismatch by updating vendor's serviceId
 */

const mongoose = require('mongoose');
const Service = require('./models/Service');
const Vendor = require('./models/Vendor');
const Category = require('./models/Category');

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

// Fix the category mismatch
const fixCategoryMismatch = async () => {
  try {
    const vendorId = '6901036683b0ef863b12b16d';
    const serviceId = '68fcdf1652f7d1dd9d2b9929';

    console.log('\n🔧 Fixing category mismatch...');

    // Get the service to find its category
    const service = await Service.findById(serviceId)
      .populate('category_id', 'name description');

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('Service category:', service.category_id?.name, `(${service.category_id?._id})`);

    // Find a service with the same category for the vendor
    const servicesWithSameCategory = await Service.find({
      category_id: service.category_id._id,
      isActive: true
    }).select('name description category_id');

    console.log(`\nFound ${servicesWithSameCategory.length} services with category "${service.category_id?.name}":`);
    servicesWithSameCategory.forEach((svc, index) => {
      console.log(`  ${index + 1}. ${svc.name} (${svc._id})`);
    });

    if (servicesWithSameCategory.length === 0) {
      console.log('❌ No services found with the same category');
      return;
    }

    // Use the first service with the same category
    const newServiceId = servicesWithSameCategory[0]._id;

    // Update the vendor's serviceId
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { serviceId: newServiceId },
      { new: true }
    ).populate('serviceId', 'name description category_id')
     .populate('serviceId.category_id', 'name description');

    console.log('\n✅ Vendor updated:');
    console.log('  - Name:', `${updatedVendor.firstName} ${updatedVendor.lastName}`);
    console.log('  - New Service ID:', updatedVendor.serviceId?._id);
    console.log('  - New Service Name:', updatedVendor.serviceId?.name);
    console.log('  - New Service Category:', updatedVendor.serviceId?.category_id?.name);

    // Test eligibility again
    console.log('\n🧪 Testing eligibility after fix...');
    const { checkVendorEligibility } = require('./utils/vendorEligibility');
    const isEligible = checkVendorEligibility(updatedVendor, service);
    console.log('  - Eligibility result:', isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE');

    if (isEligible) {
      console.log('\n🎉 SUCCESS! The vendor should now appear in the eligible vendors list.');
    } else {
      console.log('\n❌ Still not eligible. Let\'s debug further...');
    }

  } catch (error) {
    console.error('❌ Error fixing category mismatch:', error);
  }
};

// Alternative: Create a new service with the same category
const createMatchingService = async () => {
  try {
    const serviceId = '68fcdf1652f7d1dd9d2b9929';
    const vendorId = '6901036683b0ef863b12b16d';

    console.log('\n🔧 Creating a new service with matching category...');

    // Get the original service
    const originalService = await Service.findById(serviceId)
      .populate('category_id', 'name description');

    if (!originalService) {
      console.log('❌ Original service not found');
      return;
    }

    // Create a new service with the same category
    const newService = await Service.create({
      name: `${originalService.name} - Vendor Service`,
      description: `Service created for vendor assignment - ${originalService.description}`,
      basePrice: originalService.basePrice,
      unitType: originalService.unitType,
      category_id: originalService.category_id._id,
      min_time_required: originalService.min_time_required,
      availability: originalService.availability,
      job_service_type: originalService.job_service_type,
      price_type: originalService.price_type,
      subservice_type: originalService.subservice_type,
      isActive: true
    });

    console.log('✅ New service created:', newService._id);

    // Update the vendor's serviceId
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { serviceId: newService._id },
      { new: true }
    ).populate('serviceId', 'name description category_id')
     .populate('serviceId.category_id', 'name description');

    console.log('✅ Vendor updated with new service:');
    console.log('  - Vendor:', `${updatedVendor.firstName} ${updatedVendor.lastName}`);
    console.log('  - Service:', updatedVendor.serviceId?.name);
    console.log('  - Category:', updatedVendor.serviceId?.category_id?.name);

    // Test eligibility
    const { checkVendorEligibility } = require('./utils/vendorEligibility');
    const isEligible = checkVendorEligibility(updatedVendor, originalService);
    console.log('  - Eligibility result:', isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE');

  } catch (error) {
    console.error('❌ Error creating matching service:', error);
  }
};

// Main function
const runFix = async () => {
  try {
    await connectDB();
    await fixCategoryMismatch();
    // await createMatchingService(); // Uncomment if the first method doesn't work
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runFix();
}

module.exports = { runFix };

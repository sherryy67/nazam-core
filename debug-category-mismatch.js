/**
 * Debug script to check the specific vendor and service matching
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

// Debug the specific case
const debugSpecificCase = async () => {
  try {
    console.log('\n🔍 Debugging specific vendor and service...');

    const vendorId = '6901036683b0ef863b12b16d';
    const serviceId = '68fcdf1652f7d1dd9d2b9929';

    // Find vendor with populated serviceId
    const vendor = await Vendor.findById(vendorId)
      .populate('serviceId', 'name description category_id')
      .populate('serviceId.category_id', 'name description');

    if (!vendor) {
      console.log('❌ Vendor not found');
      return;
    }

    console.log('\n✅ Vendor details:');
    console.log('  - ID:', vendor._id);
    console.log('  - Name:', `${vendor.firstName} ${vendor.lastName}`);
    console.log('  - Approved:', vendor.approved);
    console.log('  - Primary Service ID:', vendor.serviceId?._id);
    console.log('  - Primary Service Name:', vendor.serviceId?.name);
    console.log('  - Primary Service Category ID:', vendor.serviceId?.category_id?._id);
    console.log('  - Primary Service Category Name:', vendor.serviceId?.category_id?.name);

    // Find service with populated category
    const service = await Service.findById(serviceId)
      .populate('category_id', 'name description');

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('\n✅ Service details:');
    console.log('  - ID:', service._id);
    console.log('  - Name:', service.name);
    console.log('  - Category ID:', service.category_id?._id);
    console.log('  - Category Name:', service.category_id?.name);
    console.log('  - Job Service Type:', service.job_service_type);
    console.log('  - Is Assigned:', service.isAssigned);
    console.log('  - Vendor ID:', service.vendorId);

    // Check category matching
    console.log('\n🔍 Category Matching Analysis:');
    const vendorCategoryId = vendor.serviceId?.category_id?._id?.toString();
    const serviceCategoryId = service.category_id?._id?.toString();
    
    console.log('  - Vendor service category ID:', vendorCategoryId);
    console.log('  - Service category ID:', serviceCategoryId);
    console.log('  - Categories match:', vendorCategoryId === serviceCategoryId);

    if (vendorCategoryId !== serviceCategoryId) {
      console.log('\n❌ CATEGORY MISMATCH FOUND!');
      console.log('  - The vendor\'s primary service category does not match the service category');
      console.log('  - This is why the vendor is not eligible');
      
      // Let's check what categories exist
      console.log('\n📋 Available categories:');
      const categories = await Category.find({ isActive: true });
      categories.forEach(cat => {
        console.log(`  - ${cat.name} (${cat._id})`);
      });
      
      // Check if we need to update the vendor's service
      console.log('\n💡 Solution: Update the vendor\'s serviceId to match the service category');
    }

    // Test eligibility manually
    console.log('\n🧪 Manual eligibility test:');
    const isEligible = checkVendorEligibility(vendor, service);
    console.log('  - Eligibility result:', isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE');

    // If not eligible, let's check each step
    if (!isEligible) {
      console.log('\n🔍 Step-by-step eligibility check:');
      
      // Step 1: Approved
      console.log('  1. Vendor approved:', vendor.approved ? '✅' : '❌');
      
      // Step 2: Category match
      const categoryMatch = vendor.serviceId && vendor.serviceId.category_id && 
                           vendor.serviceId.category_id.toString() === service.category_id.toString();
      console.log('  2. Category match:', categoryMatch ? '✅' : '❌');
      
      // Step 3: Service type check
      console.log('  3. Service type:', service.job_service_type);
      
      if (service.job_service_type === 'Scheduled') {
        console.log('     - This is a scheduled service, checking time availability...');
      } else {
        console.log('     - This is not a scheduled service, checking general availability...');
        console.log('     - Vendor availability schedule:', vendor.availabilitySchedule?.length || 0, 'entries');
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
    await debugSpecificCase();
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

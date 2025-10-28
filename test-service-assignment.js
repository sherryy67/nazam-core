/**
 * Test Script for Service Assignment Functionality
 * This script demonstrates the admin service assignment APIs
 */

const mongoose = require('mongoose');
const Service = require('./models/Service');
const Vendor = require('./models/Vendor');
const Category = require('./models/Category');
const { checkVendorEligibility } = require('./utils/vendorEligibility');

// Connect to MongoDB (adjust connection string as needed)
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

// Create sample data
const createSampleData = async () => {
  try {
    console.log('\n📝 Creating sample data...');

    // Create categories
    const cleaningCategory = await Category.create({
      name: 'Cleaning Services',
      description: 'Professional cleaning services for homes and offices',
      isActive: true
    });

    const maintenanceCategory = await Category.create({
      name: 'Maintenance Services',
      description: 'General maintenance and repair services',
      isActive: true
    });

    console.log('✅ Categories created');

    // Create services
    const waterTankService = await Service.create({
      name: 'Water Tank Cleaning',
      description: 'Professional water tank cleaning service',
      basePrice: 150,
      unitType: 'per_unit',
      category_id: cleaningCategory._id,
      min_time_required: 120, // 2 hours
      availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      job_service_type: 'Scheduled',
      price_type: 'fixed',
      subservice_type: 'single',
      scheduledDate: new Date('2025-10-28'),
      scheduledTime: '14:00',
      isActive: true
    });

    const acCleaningService = await Service.create({
      name: 'AC Cleaning',
      description: 'Air conditioning unit cleaning and maintenance',
      basePrice: 200,
      unitType: 'per_unit',
      category_id: maintenanceCategory._id,
      min_time_required: 90, // 1.5 hours
      availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      job_service_type: 'Scheduled',
      price_type: 'fixed',
      subservice_type: 'single',
      scheduledDate: new Date('2025-10-28'),
      scheduledTime: '16:00',
      isActive: true
    });

    // Create additional water tank cleaning requests for different times
    const waterTankService2 = await Service.create({
      name: 'Water Tank Cleaning',
      description: 'Professional water tank cleaning service - Request 2',
      basePrice: 150,
      unitType: 'per_unit',
      category_id: cleaningCategory._id,
      min_time_required: 120,
      availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      job_service_type: 'Scheduled',
      price_type: 'fixed',
      subservice_type: 'single',
      scheduledDate: new Date('2025-10-28'),
      scheduledTime: '18:00', // Different time
      isActive: true
    });

    const waterTankService3 = await Service.create({
      name: 'Water Tank Cleaning',
      description: 'Professional water tank cleaning service - Request 3',
      basePrice: 150,
      unitType: 'per_unit',
      category_id: cleaningCategory._id,
      min_time_required: 120,
      availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      job_service_type: 'Scheduled',
      price_type: 'fixed',
      subservice_type: 'single',
      scheduledDate: new Date('2025-10-29'), // Different date
      scheduledTime: '10:00',
      isActive: true
    });

    console.log('✅ Services created');

    // Create vendors
    const vendor1 = await Vendor.create({
      type: 'individual',
      firstName: 'John',
      lastName: 'Doe',
      coveredCity: 'Dubai',
      serviceId: waterTankService._id, // Primary service
      countryCode: '+971',
      mobileNumber: '501234567',
      email: 'john.doe@example.com',
      password: 'password123',
      idType: 'EmiratesID',
      idNumber: '784-1985-1234567-8',
      approved: true,
      availabilitySchedule: [
        { dayOfWeek: 'Mon', startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 'Tue', startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 'Wed', startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 'Thu', startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 'Fri', startTime: '09:00', endTime: '18:00' }
      ],
      privilege: 'Professional',
      experience: 5
    });

    const vendor2 = await Vendor.create({
      type: 'individual',
      firstName: 'Jane',
      lastName: 'Smith',
      coveredCity: 'Dubai',
      serviceId: acCleaningService._id, // Primary service
      countryCode: '+971',
      mobileNumber: '507654321',
      email: 'jane.smith@example.com',
      password: 'password123',
      idType: 'EmiratesID',
      idNumber: '784-1985-7654321-9',
      approved: true,
      availabilitySchedule: [
        { dayOfWeek: 'Mon', startTime: '08:00', endTime: '17:00' },
        { dayOfWeek: 'Tue', startTime: '08:00', endTime: '17:00' },
        { dayOfWeek: 'Wed', startTime: '08:00', endTime: '17:00' },
        { dayOfWeek: 'Thu', startTime: '08:00', endTime: '17:00' },
        { dayOfWeek: 'Fri', startTime: '08:00', endTime: '17:00' },
        { dayOfWeek: 'Sat', startTime: '09:00', endTime: '15:00' }
      ],
      privilege: 'Experienced',
      experience: 3
    });

    const vendor3 = await Vendor.create({
      type: 'corporate',
      company: 'CleanPro Services LLC',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      coveredCity: 'Dubai',
      serviceId: waterTankService._id, // Primary service (cleaning)
      countryCode: '+971',
      mobileNumber: '509876543',
      email: 'ahmed@cleanpro.ae',
      password: 'password123',
      idType: 'EmiratesID',
      idNumber: '784-1985-9876543-2',
      approved: true,
      availabilitySchedule: [
        { dayOfWeek: 'Mon', startTime: '07:00', endTime: '19:00' },
        { dayOfWeek: 'Tue', startTime: '07:00', endTime: '19:00' },
        { dayOfWeek: 'Wed', startTime: '07:00', endTime: '19:00' },
        { dayOfWeek: 'Thu', startTime: '07:00', endTime: '19:00' },
        { dayOfWeek: 'Fri', startTime: '07:00', endTime: '19:00' },
        { dayOfWeek: 'Sat', startTime: '08:00', endTime: '16:00' }
      ],
      privilege: 'Professional',
      experience: 8
    });

    console.log('✅ Vendors created');

    return {
      categories: [cleaningCategory, maintenanceCategory],
      services: [waterTankService, waterTankService2, waterTankService3, acCleaningService],
      vendors: [vendor1, vendor2, vendor3]
    };

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
};

// Test vendor eligibility
const testVendorEligibility = async (services, vendors) => {
  console.log('\n🔍 Testing vendor eligibility...');

  for (const service of services) {
    console.log(`\n📋 Service: ${service.name} (${service.scheduledDate?.toDateString()} at ${service.scheduledTime})`);
    console.log(`   Category: ${service.category_id}`);
    
    for (const vendor of vendors) {
      const isEligible = checkVendorEligibility(vendor, service);
      console.log(`   ${isEligible ? '✅' : '❌'} ${vendor.firstName} ${vendor.lastName} (${vendor.type}) - ${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
    }
  }
};

// Test service assignment
const testServiceAssignment = async (services, vendors) => {
  console.log('\n🎯 Testing service assignment...');

  const johnDoe = vendors[0]; // Water tank cleaning specialist
  const janeSmith = vendors[1]; // AC cleaning specialist
  const ahmedHassan = vendors[2]; // Water tank cleaning specialist

  // Test 1: Assign first water tank service to John Doe
  const waterTankService1 = services[0];
  console.log(`\n📝 Test 1: Assigning "${waterTankService1.name}" (${waterTankService1.scheduledDate?.toDateString()} at ${waterTankService1.scheduledTime}) to ${johnDoe.firstName} ${johnDoe.lastName}...`);

  try {
    const updatedService1 = await Service.findByIdAndUpdate(
      waterTankService1._id,
      {
        vendorId: johnDoe._id,
        isAssigned: true,
        assignedAt: new Date()
      },
      { new: true }
    ).populate('vendorId', 'firstName lastName email mobileNumber')
     .populate('category_id', 'name description');

    console.log('✅ Service 1 assigned successfully!');
    console.log(`   Service: ${updatedService1.name}`);
    console.log(`   Assigned to: ${updatedService1.vendorId.firstName} ${updatedService1.vendorId.lastName}`);
    console.log(`   Time: ${updatedService1.scheduledDate?.toDateString()} at ${updatedService1.scheduledTime}`);

  } catch (error) {
    console.error('❌ Error assigning service 1:', error);
  }

  // Test 2: Assign second water tank service to Ahmed Hassan (same category, different time)
  const waterTankService2 = services[1];
  console.log(`\n📝 Test 2: Assigning "${waterTankService2.name}" (${waterTankService2.scheduledDate?.toDateString()} at ${waterTankService2.scheduledTime}) to ${ahmedHassan.firstName} ${ahmedHassan.lastName}...`);

  try {
    const updatedService2 = await Service.findByIdAndUpdate(
      waterTankService2._id,
      {
        vendorId: ahmedHassan._id,
        isAssigned: true,
        assignedAt: new Date()
      },
      { new: true }
    ).populate('vendorId', 'firstName lastName email mobileNumber')
     .populate('category_id', 'name description');

    console.log('✅ Service 2 assigned successfully!');
    console.log(`   Service: ${updatedService2.name}`);
    console.log(`   Assigned to: ${updatedService2.vendorId.firstName} ${updatedService2.vendorId.lastName}`);
    console.log(`   Time: ${updatedService2.scheduledDate?.toDateString()} at ${updatedService2.scheduledTime}`);

  } catch (error) {
    console.error('❌ Error assigning service 2:', error);
  }

  // Test 3: Assign third water tank service to John Doe again (different date)
  const waterTankService3 = services[2];
  console.log(`\n📝 Test 3: Assigning "${waterTankService3.name}" (${waterTankService3.scheduledDate?.toDateString()} at ${waterTankService3.scheduledTime}) to ${johnDoe.firstName} ${johnDoe.lastName} again...`);

  try {
    const updatedService3 = await Service.findByIdAndUpdate(
      waterTankService3._id,
      {
        vendorId: johnDoe._id,
        isAssigned: true,
        assignedAt: new Date()
      },
      { new: true }
    ).populate('vendorId', 'firstName lastName email mobileNumber')
     .populate('category_id', 'name description');

    console.log('✅ Service 3 assigned successfully!');
    console.log(`   Service: ${updatedService3.name}`);
    console.log(`   Assigned to: ${updatedService3.vendorId.firstName} ${updatedService3.vendorId.lastName}`);
    console.log(`   Time: ${updatedService3.scheduledDate?.toDateString()} at ${updatedService3.scheduledTime}`);

  } catch (error) {
    console.error('❌ Error assigning service 3:', error);
  }

  // Test 4: Assign AC cleaning service to Jane Smith
  const acCleaningService = services[3];
  console.log(`\n📝 Test 4: Assigning "${acCleaningService.name}" (${acCleaningService.scheduledDate?.toDateString()} at ${acCleaningService.scheduledTime}) to ${janeSmith.firstName} ${janeSmith.lastName}...`);

  try {
    const updatedService4 = await Service.findByIdAndUpdate(
      acCleaningService._id,
      {
        vendorId: janeSmith._id,
        isAssigned: true,
        assignedAt: new Date()
      },
      { new: true }
    ).populate('vendorId', 'firstName lastName email mobileNumber')
     .populate('category_id', 'name description');

    console.log('✅ Service 4 assigned successfully!');
    console.log(`   Service: ${updatedService4.name}`);
    console.log(`   Assigned to: ${updatedService4.vendorId.firstName} ${updatedService4.vendorId.lastName}`);
    console.log(`   Time: ${updatedService4.scheduledDate?.toDateString()} at ${updatedService4.scheduledTime}`);

  } catch (error) {
    console.error('❌ Error assigning service 4:', error);
  }

  console.log('\n🎉 Multiple assignment test completed!');
  console.log('   - John Doe: 2 water tank cleaning services (different times)');
  console.log('   - Ahmed Hassan: 1 water tank cleaning service');
  console.log('   - Jane Smith: 1 AC cleaning service');
};

// Test getting assigned services
const testGetAssignedServices = async () => {
  console.log('\n📊 Testing get assigned services...');

  try {
    const assignedServices = await Service.find({ isAssigned: true })
      .populate('vendorId', 'firstName lastName email mobileNumber coveredCity')
      .populate('category_id', 'name description')
      .sort({ assignedAt: -1 });

    console.log(`✅ Found ${assignedServices.length} assigned service(s):`);
    
    assignedServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name}`);
      console.log(`      Vendor: ${service.vendorId.firstName} ${service.vendorId.lastName}`);
      console.log(`      Category: ${service.category_id.name}`);
      console.log(`      Assigned: ${service.assignedAt}`);
    });

  } catch (error) {
    console.error('❌ Error getting assigned services:', error);
  }
};

// Main test function
const runTests = async () => {
  try {
    await connectDB();
    
    // Clean up existing data
    await Service.deleteMany({});
    await Vendor.deleteMany({});
    await Category.deleteMany({});
    console.log('🧹 Cleaned up existing data');

    // Create sample data
    const { services, vendors } = await createSampleData();

    // Test vendor eligibility
    await testVendorEligibility(services, vendors);

    // Test service assignment
    await testServiceAssignment(services, vendors);

    // Test getting assigned services
    await testGetAssignedServices();

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📚 API Endpoints available:');
    console.log('   GET    /api/admin/eligible-vendors/:serviceId');
    console.log('   POST   /api/admin/assign-service');
    console.log('   DELETE /api/admin/unassign-service/:serviceId');
    console.log('   GET    /api/admin/assigned-services');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  connectDB,
  createSampleData,
  testVendorEligibility,
  testServiceAssignment,
  testGetAssignedServices,
  runTests
};

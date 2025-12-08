const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Vendor = require('../models/Vendor');
const Company = require('../models/Company');
const Service = require('../models/Service');
const ServiceRequest = require('../models/ServiceRequest');
const Admin = require('../models/Admin');

async function createTestData() {
  try {
    console.log('🧪 Creating comprehensive test data for staging...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to database');

    // Confirm this is not production
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ ERROR: This script should NOT be run in production!');
      process.exit(1);
    }

    // Create test admin if not exists
    let admin = await Admin.findOne({ email: 'admin@zushh.test' });
    if (!admin) {
      admin = await Admin.create({
        name: 'Test Admin',
        email: 'admin@zushh.test',
        password: 'admin123',
        role: 4 // ADMIN
      });
      console.log('✅ Created test admin: admin@zushh.test / admin123');
    }

    // Get first service for testing
    const service = await Service.findOne();
    if (!service) {
      console.log('⚠️  No services found. Create services first.');
      return;
    }

    console.log(`📋 Using service: ${service.name} (${service._id})`);

    // Create test companies
    console.log('\n🏢 Creating test companies...');

    const testCompanies = [
      {
        companyName: 'ABC Cleaning Services',
        registrationNumber: 'REG001',
        taxId: 'TAX001',
        email: 'contact@abc-cleaning.test',
        countryCode: '+971',
        mobileNumber: '501234567',
        phoneNumber: '021234567',
        address: '123 Business District, Dubai, UAE',
        country: 'UAE',
        city: 'Dubai',
        pinCode: '12345',
        adminFirstName: 'Ahmed',
        adminLastName: 'Al-Mansoori',
        adminEmail: 'ahmed@abc-cleaning.test',
        adminPassword: 'company123',
        bankingInfo: {
          bankName: 'Emirates NBD',
          branchName: 'Dubai Main Branch',
          bankAccountNumber: '123456789012',
          iban: 'AE123456789012345678901',
          vatRegistration: true,
          collectTax: true,
          bankingVerified: true,
          verifiedAt: new Date(),
          verifiedBy: admin._id
        },
        kycInfo: {
          businessLicense: 'https://example.com/license1.pdf',
          taxCertificate: 'https://example.com/tax1.pdf',
          kycStatus: 'approved',
          kycSubmittedAt: new Date(),
          kycVerifiedAt: new Date(),
          kycVerifiedBy: admin._id
        },
        approved: true
      },
      {
        companyName: 'Premium Home Services LLC',
        registrationNumber: 'REG002',
        taxId: 'TAX002',
        email: 'info@premium-home.test',
        countryCode: '+971',
        mobileNumber: '507654321',
        phoneNumber: '027654321',
        address: '456 Premium Street, Abu Dhabi, UAE',
        country: 'UAE',
        city: 'Abu Dhabi',
        pinCode: '67890',
        adminFirstName: 'Fatima',
        adminLastName: 'Al-Zahra',
        adminEmail: 'fatima@premium-home.test',
        adminPassword: 'company123',
        bankingInfo: {
          bankName: 'ADCB',
          branchName: 'Abu Dhabi Branch',
          bankAccountNumber: '987654321098',
          iban: 'AE987654321098765432109',
          vatRegistration: true,
          collectTax: true,
          bankingVerified: true,
          verifiedAt: new Date(),
          verifiedBy: admin._id
        },
        kycInfo: {
          businessLicense: 'https://example.com/license2.pdf',
          taxCertificate: 'https://example.com/tax2.pdf',
          kycStatus: 'approved',
          kycSubmittedAt: new Date(),
          kycVerifiedAt: new Date(),
          kycVerifiedBy: admin._id
        },
        approved: true
      }
    ];

    const createdCompanies = [];
    for (const companyData of testCompanies) {
      const company = await Company.create(companyData);
      createdCompanies.push(company);
      console.log(`✅ Created company: ${company.companyName}`);
    }

    // Create individual vendors (approved)
    console.log('\n👤 Creating individual vendors...');

    const individualVendors = [
      {
        type: 'individual',
        firstName: 'Mohammed',
        lastName: 'Al-Rashid',
        coveredCity: 'Dubai',
        serviceId: service._id,
        gender: 'Male',
        privilege: 'Experienced',
        experience: 5,
        countryCode: '+971',
        mobileNumber: '501111111',
        email: 'mohammed@test-vendor.test',
        password: 'vendor123',
        address: '789 Worker Street, Dubai, UAE',
        country: 'UAE',
        city: 'Dubai',
        pinCode: '11111',
        serviceAvailability: 'Full-time',
        bankingInfo: {
          bankName: 'Emirates NBD',
          branchName: 'Dubai Branch',
          bankAccountNumber: '111111111111',
          iban: 'AE111111111111111111111',
          vatRegistration: false,
          collectTax: false,
          bankingVerified: true,
          verifiedAt: new Date(),
          verifiedBy: admin._id
        },
        kycInfo: {
          idType: 'EmiratesID',
          idNumber: '123456789012345',
          personalIdNumber: '123456789012345',
          idDocumentFront: 'https://example.com/id-front1.jpg',
          idDocumentBack: 'https://example.com/id-back1.jpg',
          personalPhoto: 'https://example.com/photo1.jpg',
          kycStatus: 'approved',
          kycSubmittedAt: new Date(),
          kycVerifiedAt: new Date(),
          kycVerifiedBy: admin._id
        },
        availabilitySchedule: [
          { dayOfWeek: 'Mon', startTime: '09:00', endTime: '18:00' },
          { dayOfWeek: 'Tue', startTime: '09:00', endTime: '18:00' },
          { dayOfWeek: 'Wed', startTime: '09:00', endTime: '18:00' },
          { dayOfWeek: 'Thu', startTime: '09:00', endTime: '18:00' },
          { dayOfWeek: 'Fri', startTime: '09:00', endTime: '18:00' }
        ],
        unavailableDates: [
          { date: new Date('2024-12-25'), reason: 'Holiday' },
          { date: new Date('2024-12-31'), reason: 'New Year' }
        ],
        approved: true
      },
      {
        type: 'individual',
        firstName: 'Sara',
        lastName: 'Al-Mansouri',
        coveredCity: 'Abu Dhabi',
        serviceId: service._id,
        gender: 'Female',
        privilege: 'Professional',
        experience: 8,
        countryCode: '+971',
        mobileNumber: '502222222',
        email: 'sara@test-vendor.test',
        password: 'vendor123',
        address: '321 Professional Ave, Abu Dhabi, UAE',
        country: 'UAE',
        city: 'Abu Dhabi',
        pinCode: '22222',
        serviceAvailability: 'Full-time',
        bankingInfo: {
          bankName: 'ADCB',
          branchName: 'Abu Dhabi Branch',
          bankAccountNumber: '222222222222',
          iban: 'AE222222222222222222222',
          vatRegistration: true,
          collectTax: true,
          bankingVerified: true,
          verifiedAt: new Date(),
          verifiedBy: admin._id
        },
        kycInfo: {
          idType: 'EmiratesID',
          idNumber: '234567890123456',
          personalIdNumber: '234567890123456',
          idDocumentFront: 'https://example.com/id-front2.jpg',
          idDocumentBack: 'https://example.com/id-back2.jpg',
          personalPhoto: 'https://example.com/photo2.jpg',
          kycStatus: 'approved',
          kycSubmittedAt: new Date(),
          kycVerifiedAt: new Date(),
          kycVerifiedBy: admin._id
        },
        availabilitySchedule: [
          { dayOfWeek: 'Mon', startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 'Tue', startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 'Wed', startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 'Thu', startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 'Fri', startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 'Sat', startTime: '10:00', endTime: '16:00' }
        ],
        approved: true
      },
      {
        type: 'individual',
        firstName: 'Omar',
        lastName: 'Al-Khalifa',
        coveredCity: 'Sharjah',
        serviceId: service._id,
        gender: 'Male',
        privilege: 'Beginner',
        experience: 1,
        countryCode: '+971',
        mobileNumber: '503333333',
        email: 'omar@test-vendor.test',
        password: 'vendor123',
        address: '654 Newbie Lane, Sharjah, UAE',
        country: 'UAE',
        city: 'Sharjah',
        pinCode: '33333',
        serviceAvailability: 'Part-time',
        bankingInfo: {
          bankName: 'RAKBANK',
          branchName: 'Sharjah Branch',
          bankAccountNumber: '333333333333',
          iban: 'AE333333333333333333333',
          vatRegistration: false,
          collectTax: false,
          bankingVerified: false // Pending verification
        },
        kycInfo: {
          idType: 'EmiratesID',
          idNumber: '345678901234567',
          personalIdNumber: '345678901234567',
          idDocumentFront: 'https://example.com/id-front3.jpg',
          idDocumentBack: 'https://example.com/id-back3.jpg',
          personalPhoto: 'https://example.com/photo3.jpg',
          kycStatus: 'pending', // Pending approval
          kycSubmittedAt: new Date()
        },
        availabilitySchedule: [
          { dayOfWeek: 'Sat', startTime: '14:00', endTime: '20:00' },
          { dayOfWeek: 'Sun', startTime: '14:00', endTime: '20:00' }
        ],
        approved: true
      }
    ];

    const createdIndividualVendors = [];
    for (const vendorData of individualVendors) {
      const vendor = await Vendor.create(vendorData);
      createdIndividualVendors.push(vendor);
      console.log(`✅ Created individual vendor: ${vendor.firstName} ${vendor.lastName}`);
    }

    // Add staff vendors to companies
    console.log('\n👥 Adding staff vendors to companies...');

    const staffVendors = [
      {
        type: 'individual',
        companyId: createdCompanies[0]._id,
        firstName: 'Ali',
        lastName: 'Al-Hassan',
        coveredCity: 'Dubai',
        serviceId: service._id,
        gender: 'Male',
        privilege: 'Experienced',
        experience: 3,
        countryCode: '+971',
        mobileNumber: '504444444',
        email: 'ali@abc-cleaning.test',
        password: 'vendor123',
        address: 'ABC Office, Dubai, UAE',
        country: 'UAE',
        city: 'Dubai',
        pinCode: '44444',
        serviceAvailability: 'Full-time',
        active: true,
        isStaff: true,
        bankingInfo: {
          bankName: 'Emirates NBD',
          branchName: 'Dubai Main Branch',
          bankAccountNumber: '444444444444',
          iban: 'AE444444444444444444444',
          vatRegistration: true,
          collectTax: true,
          bankingVerified: true,
          verifiedAt: new Date(),
          verifiedBy: admin._id
        },
        kycInfo: {
          idType: 'EmiratesID',
          idNumber: '456789012345678',
          personalIdNumber: '456789012345678',
          idDocumentFront: 'https://example.com/id-front4.jpg',
          idDocumentBack: 'https://example.com/id-back4.jpg',
          personalPhoto: 'https://example.com/photo4.jpg',
          kycStatus: 'approved',
          kycSubmittedAt: new Date(),
          kycVerifiedAt: new Date(),
          kycVerifiedBy: admin._id
        },
        availabilitySchedule: [
          { dayOfWeek: 'Mon', startTime: '09:00', endTime: '18:00' },
          { dayOfWeek: 'Tue', startTime: '09:00', endTime: '18:00' },
          { dayOfWeek: 'Wed', startTime: '09:00', endTime: '18:00' },
          { dayOfWeek: 'Thu', startTime: '09:00', endTime: '18:00' },
          { dayOfWeek: 'Fri', startTime: '09:00', endTime: '18:00' }
        ],
        approved: true
      },
      {
        type: 'individual',
        companyId: createdCompanies[1]._id,
        firstName: 'Layla',
        lastName: 'Al-Rashid',
        coveredCity: 'Abu Dhabi',
        serviceId: service._id,
        gender: 'Female',
        privilege: 'Professional',
        experience: 6,
        countryCode: '+971',
        mobileNumber: '505555555',
        email: 'layla@premium-home.test',
        password: 'vendor123',
        address: 'Premium Office, Abu Dhabi, UAE',
        country: 'UAE',
        city: 'Abu Dhabi',
        pinCode: '55555',
        serviceAvailability: 'Full-time',
        active: true,
        isStaff: true,
        bankingInfo: {
          bankName: 'ADCB',
          branchName: 'Abu Dhabi Branch',
          bankAccountNumber: '555555555555',
          iban: 'AE555555555555555555555',
          vatRegistration: true,
          collectTax: true,
          bankingVerified: true,
          verifiedAt: new Date(),
          verifiedBy: admin._id
        },
        kycInfo: {
          idType: 'EmiratesID',
          idNumber: '567890123456789',
          personalIdNumber: '567890123456789',
          idDocumentFront: 'https://example.com/id-front5.jpg',
          idDocumentBack: 'https://example.com/id-back5.jpg',
          personalPhoto: 'https://example.com/photo5.jpg',
          kycStatus: 'approved',
          kycSubmittedAt: new Date(),
          kycVerifiedAt: new Date(),
          kycVerifiedBy: admin._id
        },
        availabilitySchedule: [
          { dayOfWeek: 'Mon', startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 'Tue', startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 'Wed', startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 'Thu', startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 'Fri', startTime: '08:00', endTime: '17:00' }
        ],
        approved: true
      }
    ];

    for (const staffData of staffVendors) {
      const staff = await Vendor.create(staffData);
      // Add to company's staff list
      await Company.findByIdAndUpdate(staffData.companyId, {
        $push: {
          staffVendors: {
            vendorId: staff._id,
            addedAt: new Date()
          }
        }
      });
      console.log(`✅ Created staff vendor: ${staff.firstName} ${staff.lastName} (${staff.companyId})`);
    }

    // Create sample service requests
    console.log('\n📋 Creating sample service requests...');

    const sampleRequests = [
      {
        user_name: 'John Customer',
        user_email: 'john@test-customer.test',
        user_phone: '+971501234567',
        address: '123 Customer Street, Dubai, UAE',
        service_id: service._id,
        service_name: service.name,
        category_id: service.category_id,
        category_name: 'Home Services',
        request_type: 'Scheduled',
        requested_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        message: 'Need cleaning service for my apartment',
        status: 'Assigned',
        vendor: createdIndividualVendors[0]._id, // Assign to Mohammed
        unit_type: 'hours',
        unit_price: service.basePrice || 50,
        number_of_units: 4,
        total_price: (service.basePrice || 50) * 4
      },
      {
        user_name: 'Jane Customer',
        user_email: 'jane@test-customer.test',
        user_phone: '+971507654321',
        address: '456 Customer Avenue, Abu Dhabi, UAE',
        service_id: service._id,
        service_name: service.name,
        category_id: service.category_id,
        category_name: 'Home Services',
        request_type: 'Scheduled',
        requested_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        message: 'Regular cleaning service needed',
        status: 'Accepted',
        vendor: createdIndividualVendors[1]._id, // Assign to Sara
        unit_type: 'hours',
        unit_price: service.basePrice || 50,
        number_of_units: 3,
        total_price: (service.basePrice || 50) * 3
      },
      {
        user_name: 'Bob Customer',
        user_email: 'bob@test-customer.test',
        user_phone: '+971509876543',
        address: '789 Customer Road, Sharjah, UAE',
        service_id: service._id,
        service_name: service.name,
        category_id: service.category_id,
        category_name: 'Home Services',
        request_type: 'Scheduled',
        requested_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        message: 'Deep cleaning required',
        status: 'Pending',
        unit_type: 'hours',
        unit_price: service.basePrice || 50,
        number_of_units: 6,
        total_price: (service.basePrice || 50) * 6
      }
    ];

    for (const requestData of sampleRequests) {
      await ServiceRequest.create(requestData);
    }

    console.log(`✅ Created ${sampleRequests.length} sample service requests`);

    // Final summary
    const finalStats = await Promise.all([
      Vendor.countDocuments(),
      Company.countDocuments(),
      ServiceRequest.countDocuments(),
      Vendor.countDocuments({ type: 'individual' }),
      Vendor.countDocuments({ isStaff: true }),
      Vendor.countDocuments({ 'kycInfo.kycStatus': 'approved' }),
      Vendor.countDocuments({ 'bankingInfo.bankingVerified': true })
    ]);

    console.log('\n🎯 Test Data Creation Complete!');
    console.log('===============================');
    console.log(`🏪 Companies: ${finalStats[1]}`);
    console.log(`👤 Individual Vendors: ${finalStats[3]}`);
    console.log(`👥 Staff Vendors: ${finalStats[4]}`);
    console.log(`📋 Service Requests: ${finalStats[2]}`);
    console.log(`✅ KYC Approved: ${finalStats[5]}`);
    console.log(`✅ Banking Verified: ${finalStats[6]}`);

    console.log('\n🔐 Test Accounts Created:');
    console.log('Admin: admin@zushh.test / admin123');
    console.log('Company 1: ahmed@abc-cleaning.test / company123');
    console.log('Company 2: fatima@premium-home.test / company123');
    console.log('Individual Vendors: mohammed@test-vendor.test, sara@test-vendor.test, omar@test-vendor.test / vendor123');
    console.log('Staff Vendors: ali@abc-cleaning.test, layla@premium-home.test / vendor123');

    console.log('\n🧪 Ready for testing all vendor management features!');

  } catch (error) {
    console.error('💥 Test data creation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createTestData();
}

module.exports = { createTestData };

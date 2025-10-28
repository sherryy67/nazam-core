/**
 * Test script for the admin create vendor API
 * This shows the correct format for the availabilitySchedule field
 */

const axios = require('axios');

const testCreateVendor = async () => {
  try {
    console.log('🧪 Testing admin create vendor API...');
    
    const baseURL = 'http://localhost:5000'; // Adjust port as needed
    const endpoint = `${baseURL}/api/auth/admin/create-vendor`;
    
    // Example vendor data with correct availabilitySchedule format
    const vendorData = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe.test@example.com",
      password: "password123",
      type: "individual",
      coveredCity: "Dubai",
      serviceId: "68fcdf1652f7d1dd9d2b9929", // Replace with actual service ID
      countryCode: "+971",
      mobileNumber: "501234567",
      idType: "EmiratesID",
      idNumber: "784-1234-5678901-2",
      
      // Optional fields
      company: "ABC Company",
      gender: "Male",
      privilege: "Experienced",
      experience: 5,
      serviceAvailability: "Full-time",
      vatRegistration: true,
      collectTax: false,
      
      // AVAILABILITY SCHEDULE - This is the correct format
      availabilitySchedule: [
        {
          dayOfWeek: "Mon",
          startTime: "09:00",
          endTime: "18:00"
        },
        {
          dayOfWeek: "Tue", 
          startTime: "09:00",
          endTime: "18:00"
        },
        {
          dayOfWeek: "Wed",
          startTime: "09:00", 
          endTime: "18:00"
        },
        {
          dayOfWeek: "Thu",
          startTime: "09:00",
          endTime: "18:00"
        },
        {
          dayOfWeek: "Fri",
          startTime: "09:00",
          endTime: "18:00"
        }
      ],
      
      // UNAVAILABLE DATES - Optional
      unavailableDates: [
        {
          date: "2024-12-25",
          reason: "Holiday"
        }
      ]
    };
    
    console.log('📤 Sending request with data:', JSON.stringify(vendorData, null, 2));
    
    const response = await axios.post(endpoint, vendorData, {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE', // Replace with actual admin token
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.data?.exception === 'INVALID_AVAILABILITY_SCHEDULE') {
      console.log('\n💡 Tips for availabilitySchedule:');
      console.log('1. Make sure it\'s an array of objects');
      console.log('2. Each object should have dayOfWeek, startTime, and endTime');
      console.log('3. dayOfWeek should be one of: Sun, Mon, Tue, Wed, Thu, Fri, Sat');
      console.log('4. Times should be in HH:MM format (24-hour)');
      console.log('5. If sending as form data, you might need to stringify the array');
    }
  }
};

// Alternative test with form data (if using multipart/form-data)
const testCreateVendorFormData = async () => {
  try {
    console.log('\n🧪 Testing with form data...');
    
    const baseURL = 'http://localhost:5000';
    const endpoint = `${baseURL}/api/auth/admin/create-vendor`;
    
    const formData = new FormData();
    formData.append('firstName', 'Jane');
    formData.append('lastName', 'Smith');
    formData.append('email', 'jane.smith.test@example.com');
    formData.append('password', 'password123');
    formData.append('type', 'individual');
    formData.append('coveredCity', 'Dubai');
    formData.append('serviceId', '68fcdf1652f7d1dd9d2b9929');
    formData.append('countryCode', '+971');
    formData.append('mobileNumber', '507654321');
    formData.append('idType', 'EmiratesID');
    formData.append('idNumber', '784-1234-7654321-9');
    formData.append('privilege', 'Professional');
    formData.append('experience', '3');
    formData.append('serviceAvailability', 'Full-time');
    formData.append('vatRegistration', 'true');
    formData.append('collectTax', 'false');
    
    // Stringify the array for form data
    formData.append('availabilitySchedule', JSON.stringify([
      { dayOfWeek: 'Mon', startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 'Tue', startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 'Wed', startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 'Thu', startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 'Fri', startTime: '09:00', endTime: '18:00' }
    ]));
    
    formData.append('unavailableDates', JSON.stringify([
      { date: '2024-12-25', reason: 'Holiday' }
    ]));
    
    const response = await axios.post(endpoint, formData, {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE',
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('✅ Form data success! Response:', response.data);
    
  } catch (error) {
    console.error('❌ Form data error:', error.response?.data || error.message);
  }
};

// Run tests
if (require.main === module) {
  testCreateVendor();
  // testCreateVendorFormData(); // Uncomment if using form data
}

module.exports = { testCreateVendor, testCreateVendorFormData };

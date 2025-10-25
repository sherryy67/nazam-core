/**
 * Test script for admin create vendor endpoint with multipart form data
 * This script tests the updated POST /api/auth/admin/create-vendor endpoint
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_ADMIN_TOKEN = 'your_admin_jwt_token_here'; // Replace with actual admin token

// Test data
const vendorData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'password123',
  type: 'individual',
  coveredCity: 'Dubai',
  jobService: 'Plumber',
  countryCode: '+971',
  mobileNumber: '501234567',
  idType: 'EmiratesID',
  idNumber: '784-1234-5678901-2',
  company: 'ABC Plumbing Services',
  gender: 'Male',
  dob: '1990-01-01',
  privilege: 'Experienced',
  experience: 5,
  bankName: 'Emirates NBD',
  branchName: 'Dubai Mall Branch',
  bankAccountNumber: '1234567890',
  iban: 'AE070331234567890123456',
  personalIdNumber: '123456789',
  address: '123 Main Street, Dubai, UAE',
  country: 'UAE',
  city: 'Dubai',
  pinCode: '12345',
  serviceAvailability: 'Full-time',
  vatRegistration: 'true',
  collectTax: 'false'
};

async function testVendorCreation() {
  console.log('🚀 Testing Admin Create Vendor API with Multipart Form Data...\n');

  try {
    // Test 1: Create vendor without profile picture
    console.log('1. Testing vendor creation without profile picture...');
    const formData1 = new FormData();
    
    // Add all vendor data to form
    Object.keys(vendorData).forEach(key => {
      formData1.append(key, vendorData[key]);
    });

    const response1 = await axios.post(`${BASE_URL}/auth/admin/create-vendor`, formData1, {
      headers: {
        'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
        ...formData1.getHeaders()
      }
    });
    
    if (response1.data.success) {
      console.log('✅ Vendor created successfully without profile picture');
      console.log(`   - Vendor ID: ${response1.data.data.vendor._id}`);
      console.log(`   - Name: ${response1.data.data.vendor.firstName} ${response1.data.data.vendor.lastName}`);
      console.log(`   - Email: ${response1.data.data.vendor.email}`);
      console.log(`   - Profile Pic: ${response1.data.data.vendor.profilePic || 'None'}`);
    } else {
      console.log('❌ Failed to create vendor without profile picture');
      return;
    }

    // Test 2: Create vendor with profile picture
    console.log('\n2. Testing vendor creation with profile picture...');
    const formData2 = new FormData();
    
    // Add all vendor data to form
    Object.keys(vendorData).forEach(key => {
      if (key !== 'email') { // Use different email
        formData2.append(key, vendorData[key]);
      } else {
        formData2.append(key, 'jane.doe@example.com');
      }
    });

    // Create a dummy image file for testing
    const dummyImagePath = path.join(__dirname, 'test-profile.jpg');
    if (!fs.existsSync(dummyImagePath)) {
      // Create a simple test image (1x1 pixel JPEG)
      const testImageBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
        0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14,
        0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01,
        0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x2A, 0x00, 0xFF, 0xD9
      ]);
      fs.writeFileSync(dummyImagePath, testImageBuffer);
    }

    // Add profile picture to form
    formData2.append('profilePic', fs.createReadStream(dummyImagePath), {
      filename: 'profile.jpg',
      contentType: 'image/jpeg'
    });

    const response2 = await axios.post(`${BASE_URL}/auth/admin/create-vendor`, formData2, {
      headers: {
        'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
        ...formData2.getHeaders()
      }
    });
    
    if (response2.data.success) {
      console.log('✅ Vendor created successfully with profile picture');
      console.log(`   - Vendor ID: ${response2.data.data.vendor._id}`);
      console.log(`   - Name: ${response2.data.data.vendor.firstName} ${response2.data.data.vendor.lastName}`);
      console.log(`   - Email: ${response2.data.data.vendor.email}`);
      console.log(`   - Profile Pic: ${response2.data.data.vendor.profilePic || 'None'}`);
    } else {
      console.log('❌ Failed to create vendor with profile picture');
    }

    // Test 3: Test validation - missing required fields
    console.log('\n3. Testing validation - missing required fields...');
    try {
      const incompleteFormData = new FormData();
      incompleteFormData.append('firstName', 'John');
      // Missing other required fields

      await axios.post(`${BASE_URL}/auth/admin/create-vendor`, incompleteFormData, {
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
          ...incompleteFormData.getHeaders()
        }
      });
      console.log('❌ Should have failed with missing required fields');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Missing required fields properly rejected');
        console.log(`   - Error: ${error.response.data.message}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 4: Test validation - duplicate email
    console.log('\n4. Testing validation - duplicate email...');
    try {
      const duplicateFormData = new FormData();
      Object.keys(vendorData).forEach(key => {
        duplicateFormData.append(key, vendorData[key]);
      });

      await axios.post(`${BASE_URL}/auth/admin/create-vendor`, duplicateFormData, {
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
          ...duplicateFormData.getHeaders()
        }
      });
      console.log('❌ Should have failed with duplicate email');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Duplicate email properly rejected');
        console.log(`   - Error: ${error.response.data.message}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 5: Test file validation - invalid file type
    console.log('\n5. Testing file validation - invalid file type...');
    try {
      const invalidFileFormData = new FormData();
      Object.keys(vendorData).forEach(key => {
        if (key !== 'email') {
          invalidFileFormData.append(key, vendorData[key]);
        } else {
          invalidFileFormData.append(key, 'invalid.file@example.com');
        }
      });

      // Create a text file instead of image
      const textFilePath = path.join(__dirname, 'test.txt');
      fs.writeFileSync(textFilePath, 'This is not an image');
      invalidFileFormData.append('profilePic', fs.createReadStream(textFilePath), {
        filename: 'test.txt',
        contentType: 'text/plain'
      });

      await axios.post(`${BASE_URL}/auth/admin/create-vendor`, invalidFileFormData, {
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
          ...invalidFileFormData.getHeaders()
        }
      });
      console.log('❌ Should have failed with invalid file type');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid file type properly rejected');
        console.log(`   - Error: ${error.response.data.message}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Clean up test files
    if (fs.existsSync(dummyImagePath)) {
      fs.unlinkSync(dummyImagePath);
    }
    const textFilePath = path.join(__dirname, 'test.txt');
    if (fs.existsSync(textFilePath)) {
      fs.unlinkSync(textFilePath);
    }

    console.log('\n🎉 All vendor creation tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Make sure to set a valid admin JWT token in TEST_ADMIN_TOKEN');
    }
  }
}

// Usage examples
function showUsageExamples() {
  console.log('\n📋 Usage Examples:\n');
  
  console.log('1. Using axios with FormData:');
  console.log(`
const FormData = require('form-data');
const fs = require('fs');

const formData = new FormData();
formData.append('firstName', 'John');
formData.append('lastName', 'Doe');
formData.append('email', 'john@example.com');
formData.append('password', 'password123');
formData.append('type', 'individual');
formData.append('coveredCity', 'Dubai');
formData.append('jobService', 'Plumber');
formData.append('countryCode', '+971');
formData.append('mobileNumber', '501234567');
formData.append('idType', 'EmiratesID');
formData.append('idNumber', '784-1234-5678901-2');

// Add profile picture
formData.append('profilePic', fs.createReadStream('profile.jpg'), {
  filename: 'profile.jpg',
  contentType: 'image/jpeg'
});

const response = await axios.post('/api/auth/admin/create-vendor', formData, {
  headers: {
    'Authorization': \`Bearer \${adminToken}\`,
    ...formData.getHeaders()
  }
});
  `);
  
  console.log('2. Using fetch with FormData:');
  console.log(`
const formData = new FormData();
formData.append('firstName', 'John');
formData.append('lastName', 'Doe');
formData.append('email', 'john@example.com');
// ... add other fields

// Add profile picture
formData.append('profilePic', fileInput.files[0]);

const response = await fetch('/api/auth/admin/create-vendor', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${adminToken}\`
  },
  body: formData
});
  `);
  
  console.log('3. Frontend integration (React):');
  console.log(`
const CreateVendorForm = () => {
  const [formData, setFormData] = useState({});
  const [profilePic, setProfilePic] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    
    // Add form fields
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });
    
    // Add profile picture
    if (profilePic) {
      formDataToSend.append('profilePic', profilePic);
    }
    
    try {
      const response = await fetch('/api/auth/admin/create-vendor', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${adminToken}\`
        },
        body: formDataToSend
      });
      
      const data = await response.json();
      console.log('Vendor created:', data);
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        name="firstName" 
        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
      />
      {/* Other form fields */}
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => setProfilePic(e.target.files[0])}
      />
      <button type="submit">Create Vendor</button>
    </form>
  );
};
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testVendorCreation();
  showUsageExamples();
}

module.exports = { testVendorCreation, showUsageExamples };

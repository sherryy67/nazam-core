/**
 * Test script for vendor creation with profile picture upload
 * Tests the POST /api/auth/admin/create-vendor endpoint with multipart form data
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3001/api';

async function testVendorCreationWithProfilePic() {
  console.log('🚀 Testing Vendor Creation with Profile Picture Upload...\n');

  try {
    // Test 1: Create vendor with profile picture
    console.log('1. Testing vendor creation with profile picture...');
    
    // Create a test image file (small PNG)
    const testImagePath = path.join(__dirname, 'test-profile-pic.png');
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ]);
    
    fs.writeFileSync(testImagePath, testImageBuffer);
    console.log('✅ Test image created');

    // Create form data
    const formData = new FormData();
    
    // Add vendor data
    formData.append('firstName', 'John');
    formData.append('lastName', 'Doe');
    formData.append('email', 'john.doe.vendor@example.com');
    formData.append('password', 'password123');
    formData.append('type', 'Individual');
    formData.append('coveredCity', 'Dubai');
    formData.append('jobService', 'Plumbing');
    formData.append('countryCode', '+971');
    formData.append('mobileNumber', '501234567');
    formData.append('idType', 'Emirates ID');
    formData.append('idNumber', '784-1234-5678901-2');
    
    // Add optional fields
    formData.append('company', 'Doe Plumbing Services');
    formData.append('gender', 'Male');
    formData.append('experience', '5 years');
    formData.append('address', '123 Main Street, Dubai');
    formData.append('city', 'Dubai');
    formData.append('country', 'UAE');
    formData.append('pinCode', '12345');
    formData.append('vatRegistration', 'false');
    formData.append('collectTax', 'false');
    
    // Add profile picture
    formData.append('profilePic', fs.createReadStream(testImagePath), {
      filename: 'test-profile-pic.png',
      contentType: 'image/png'
    });

    console.log('📤 Sending vendor creation request with profile picture...');
    
    // You'll need to replace 'YOUR_ADMIN_TOKEN' with an actual admin token
    const adminToken = 'YOUR_ADMIN_TOKEN'; // Replace with actual admin token
    
    const response = await axios.post(`${BASE_URL}/auth/admin/create-vendor`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${adminToken}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.data.success) {
      console.log('✅ Vendor created successfully with profile picture');
      console.log(`   - Vendor ID: ${response.data.content.vendor._id}`);
      console.log(`   - Name: ${response.data.content.vendor.firstName} ${response.data.content.vendor.lastName}`);
      console.log(`   - Email: ${response.data.content.vendor.email}`);
      console.log(`   - Profile Pic URL: ${response.data.content.vendor.profilePic}`);
      
      // Verify the profile picture URL is accessible
      if (response.data.content.vendor.profilePic) {
        try {
          const imageResponse = await axios.head(response.data.content.vendor.profilePic);
          console.log(`   - Profile picture accessible: ${imageResponse.status === 200 ? 'Yes' : 'No'}`);
        } catch (imageError) {
          console.log(`   - Profile picture accessibility: Error - ${imageError.message}`);
        }
      }
    } else {
      console.log('❌ Failed to create vendor');
      console.log(`   - Error: ${response.data.description}`);
    }

    // Clean up test image
    fs.unlinkSync(testImagePath);
    console.log('✅ Test image cleaned up');

    // Test 2: Create vendor without profile picture
    console.log('\n2. Testing vendor creation without profile picture...');
    
    const formDataNoPic = new FormData();
    formDataNoPic.append('firstName', 'Jane');
    formDataNoPic.append('lastName', 'Smith');
    formDataNoPic.append('email', 'jane.smith.vendor@example.com');
    formDataNoPic.append('password', 'password123');
    formDataNoPic.append('type', 'Individual');
    formDataNoPic.append('coveredCity', 'Abu Dhabi');
    formDataNoPic.append('jobService', 'Cleaning');
    formDataNoPic.append('countryCode', '+971');
    formDataNoPic.append('mobileNumber', '501234568');
    formDataNoPic.append('idType', 'Emirates ID');
    formDataNoPic.append('idNumber', '784-1234-5678901-3');

    const response2 = await axios.post(`${BASE_URL}/auth/admin/create-vendor`, formDataNoPic, {
      headers: {
        ...formDataNoPic.getHeaders(),
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (response2.data.success) {
      console.log('✅ Vendor created successfully without profile picture');
      console.log(`   - Vendor ID: ${response2.data.content.vendor._id}`);
      console.log(`   - Name: ${response2.data.content.vendor.firstName} ${response2.data.content.vendor.lastName}`);
      console.log(`   - Profile Pic: ${response2.data.content.vendor.profilePic || 'Not provided'}`);
    } else {
      console.log('❌ Failed to create vendor without profile picture');
      console.log(`   - Error: ${response2.data.description}`);
    }

    console.log('\n🎉 All vendor creation tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Unauthorized - make sure to provide a valid admin token');
    } else if (error.response?.status === 400) {
      console.log('\n💡 Bad request - check the request data');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Server error - check the server logs for details');
    }
  }
}

// Usage examples
function showUsageExamples() {
  console.log('\n📋 Usage Examples:\n');
  
  console.log('1. Frontend integration (React with file upload):');
  console.log(`
const VendorCreationForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    type: 'Individual',
    coveredCity: '',
    jobService: '',
    countryCode: '+971',
    mobileNumber: '',
    idType: 'Emirates ID',
    idNumber: ''
  });
  const [profilePic, setProfilePic] = useState(null);

  const handleFileChange = (e) => {
    setProfilePic(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    
    // Add all form fields
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });
    
    // Add profile picture if selected
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
      
      if (data.success) {
        console.log('Vendor created:', data.content.vendor);
        // Show success message
      } else {
        throw new Error(data.description);
      }
    } catch (error) {
      console.error('Error creating vendor:', error.message);
      // Show error message
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        name="firstName" 
        value={formData.firstName}
        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
        placeholder="First Name"
        required
      />
      <input 
        type="text" 
        name="lastName" 
        value={formData.lastName}
        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
        placeholder="Last Name"
        required
      />
      <input 
        type="email" 
        name="email" 
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        placeholder="Email"
        required
      />
      <input 
        type="file" 
        accept="image/*"
        onChange={handleFileChange}
      />
      <button type="submit">Create Vendor</button>
    </form>
  );
};
  `);
  
  console.log('2. cURL example:');
  console.log(`
curl -X POST "http://localhost:3001/api/auth/admin/create-vendor" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -F "firstName=John" \\
  -F "lastName=Doe" \\
  -F "email=john.doe@example.com" \\
  -F "password=password123" \\
  -F "type=Individual" \\
  -F "coveredCity=Dubai" \\
  -F "jobService=Plumbing" \\
  -F "countryCode=+971" \\
  -F "mobileNumber=501234567" \\
  -F "idType=Emirates ID" \\
  -F "idNumber=784-1234-5678901-2" \\
  -F "profilePic=@/path/to/profile-picture.png"
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testVendorCreationWithProfilePic();
  showUsageExamples();
}

module.exports = { testVendorCreationWithProfilePic, showUsageExamples };

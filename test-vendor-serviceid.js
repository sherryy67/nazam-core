/**
 * Test script for vendor creation with serviceId
 * Tests the updated POST /api/auth/admin/create-vendor endpoint
 */

const axios = require('axios');
const FormData = require('form-data');

// Configuration
const BASE_URL = 'http://localhost:3001/api';

async function testVendorCreationWithServiceId() {
  console.log('🚀 Testing Vendor Creation with ServiceId...\n');

  try {
    // First, get available services to use a valid serviceId
    console.log('1. Fetching available services...');
    const servicesResponse = await axios.get(`${BASE_URL}/services/active`);
    
    if (!servicesResponse.data.success || servicesResponse.data.content.services.length === 0) {
      console.log('❌ No active services found. Please create services first.');
      return;
    }
    
    const firstService = servicesResponse.data.content.services[0];
    const serviceId = firstService._id;
    console.log(`✅ Using service: ${firstService.name} (ID: ${serviceId})`);

    // Test 1: Create vendor with valid serviceId
    console.log('\n2. Testing vendor creation with valid serviceId...');
    
    const formData = new FormData();
    
    // Add vendor data
    formData.append('firstName', 'John');
    formData.append('lastName', 'Doe');
    formData.append('email', 'john.doe.vendor@example.com');
    formData.append('password', 'password123');
    formData.append('type', 'Individual');
    formData.append('coveredCity', 'Dubai');
    formData.append('serviceId', serviceId); // Using actual service ID
    formData.append('countryCode', '+971');
    formData.append('mobileNumber', '501234567');
    formData.append('idType', 'EmiratesID');
    formData.append('idNumber', '784-1234-5678901-2');
    
    // Add optional fields
    formData.append('company', 'Doe Services');
    formData.append('gender', 'Male');
    formData.append('experience', '5');
    formData.append('address', '123 Main Street, Dubai');
    formData.append('city', 'Dubai');
    formData.append('country', 'UAE');
    formData.append('pinCode', '12345');
    formData.append('vatRegistration', 'false');
    formData.append('collectTax', 'false');

    console.log('📤 Sending vendor creation request with serviceId...');
    
    // You'll need to replace 'YOUR_ADMIN_TOKEN' with an actual admin token
    const adminToken = 'YOUR_ADMIN_TOKEN'; // Replace with actual admin token
    
    const response = await axios.post(`${BASE_URL}/auth/admin/create-vendor`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ Vendor created successfully with serviceId');
      console.log(`   - Vendor ID: ${response.data.content.vendor._id}`);
      console.log(`   - Name: ${response.data.content.vendor.firstName} ${response.data.content.vendor.lastName}`);
      console.log(`   - Email: ${response.data.content.vendor.email}`);
      console.log(`   - Service ID: ${response.data.content.vendor.serviceId}`);
      console.log(`   - Covered City: ${response.data.content.vendor.coveredCity}`);
    } else {
      console.log('❌ Failed to create vendor');
      console.log(`   - Error: ${response.data.description}`);
    }

    // Test 2: Create vendor with invalid serviceId
    console.log('\n3. Testing vendor creation with invalid serviceId...');
    
    const formDataInvalid = new FormData();
    formDataInvalid.append('firstName', 'Jane');
    formDataInvalid.append('lastName', 'Smith');
    formDataInvalid.append('email', 'jane.smith.vendor@example.com');
    formDataInvalid.append('password', 'password123');
    formDataInvalid.append('type', 'Individual');
    formDataInvalid.append('coveredCity', 'Abu Dhabi');
    formDataInvalid.append('serviceId', '64a1b2c3d4e5f6789abcdef9'); // Invalid service ID
    formDataInvalid.append('countryCode', '+971');
    formDataInvalid.append('mobileNumber', '501234568');
    formDataInvalid.append('idType', 'EmiratesID');
    formDataInvalid.append('idNumber', '784-1234-5678901-3');

    try {
      const response2 = await axios.post(`${BASE_URL}/auth/admin/create-vendor`, formDataInvalid, {
        headers: {
          ...formDataInvalid.getHeaders(),
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log('❌ Should have failed with invalid serviceId');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid serviceId properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 3: Create vendor without serviceId
    console.log('\n4. Testing vendor creation without serviceId...');
    
    const formDataMissing = new FormData();
    formDataMissing.append('firstName', 'Bob');
    formDataMissing.append('lastName', 'Johnson');
    formDataMissing.append('email', 'bob.johnson.vendor@example.com');
    formDataMissing.append('password', 'password123');
    formDataMissing.append('type', 'Individual');
    formDataMissing.append('coveredCity', 'Sharjah');
    // Missing serviceId
    formDataMissing.append('countryCode', '+971');
    formDataMissing.append('mobileNumber', '501234569');
    formDataMissing.append('idType', 'EmiratesID');
    formDataMissing.append('idNumber', '784-1234-5678901-4');

    try {
      const response3 = await axios.post(`${BASE_URL}/auth/admin/create-vendor`, formDataMissing, {
        headers: {
          ...formDataMissing.getHeaders(),
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log('❌ Should have failed with missing serviceId');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Missing serviceId properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
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
  
  console.log('1. Frontend integration (React):');
  console.log(`
const VendorCreationForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    type: 'Individual',
    coveredCity: '',
    serviceId: '', // Now using serviceId instead of jobService
    countryCode: '+971',
    mobileNumber: '',
    idType: 'EmiratesID',
    idNumber: ''
  });
  const [services, setServices] = useState([]);

  useEffect(() => {
    // Fetch available services
    fetch('/api/services/active')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setServices(data.content.services);
        }
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    
    // Add all form fields
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });
    
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
      <select 
        name="serviceId" 
        value={formData.serviceId}
        onChange={(e) => setFormData({...formData, serviceId: e.target.value})}
        required
      >
        <option value="">Select a Service</option>
        {services.map(service => (
          <option key={service._id} value={service._id}>
            {service.name} - ${service.basePrice} per {service.unitType}
          </option>
        ))}
      </select>
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
  -F "serviceId=64a1b2c3d4e5f6789abcdef1" \\
  -F "countryCode=+971" \\
  -F "mobileNumber=501234567" \\
  -F "idType=EmiratesID" \\
  -F "idNumber=784-1234-5678901-2"
  `);
  
  console.log('3. Service selection helper:');
  console.log(`
const getServicesForVendorSelection = async () => {
  try {
    const response = await fetch('/api/services/active');
    const data = await response.json();
    
    if (data.success) {
      return data.content.services.map(service => ({
        id: service._id,
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        unitType: service.unitType,
        category: service.category_id?.name
      }));
    }
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
};
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testVendorCreationWithServiceId();
  showUsageExamples();
}

module.exports = { testVendorCreationWithServiceId, showUsageExamples };

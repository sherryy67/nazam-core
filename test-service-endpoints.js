/**
 * Test script for new service endpoints
 * This script tests the GET /api/services/:id and POST /api/submit-service-requests endpoints
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_TOKEN = 'your_jwt_token_here'; // Replace with actual token

// Test data
const testServiceRequest = {
  user_name: "John Doe",
  user_phone: "+1234567890",
  user_email: "john@example.com",
  address: "123 Main St, City, State 12345",
  service_id: "64a1b2c3d4e5f6789abcdef1", // Replace with actual service ID
  service_name: "AC Cleaning Service",
  category_id: "64a1b2c3d4e5f6789abcdef0", // Replace with actual category ID
  category_name: "Home Cleaning",
  request_type: "OnTime",
  requested_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  message: "Please clean the AC unit in the living room"
};

async function testServiceEndpoints() {
  console.log('🚀 Testing Service Endpoints...\n');

  try {
    // Test 1: Get service by ID
    console.log('1. Testing GET service by ID...');
    const serviceId = '64a1b2c3d4e5f6789abcdef1'; // Replace with actual service ID
    const serviceResponse = await axios.get(`${BASE_URL}/services/${serviceId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    if (serviceResponse.data.success) {
      console.log('✅ Service retrieved successfully');
      console.log(`   - Service name: ${serviceResponse.data.content.service.name}`);
      console.log(`   - Category: ${serviceResponse.data.content.service.category_id?.name || 'N/A'}`);
      console.log(`   - Job type: ${serviceResponse.data.content.service.job_service_type}`);
      console.log(`   - Base price: $${serviceResponse.data.content.service.basePrice}`);
    } else {
      console.log('❌ Failed to retrieve service');
      return;
    }

    // Test 2: Submit service request
    console.log('\n2. Testing service request submission...');
    const requestResponse = await axios.post(`${BASE_URL}/submit-service-requests`, testServiceRequest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (requestResponse.data.success) {
      console.log('✅ Service request submitted successfully');
      console.log(`   - Request ID: ${requestResponse.data.content.serviceRequest._id}`);
      console.log(`   - User: ${requestResponse.data.content.serviceRequest.user_name}`);
      console.log(`   - Service: ${requestResponse.data.content.serviceRequest.service_name}`);
      console.log(`   - Request type: ${requestResponse.data.content.serviceRequest.request_type}`);
      console.log(`   - Status: ${requestResponse.data.content.serviceRequest.status}`);
    } else {
      console.log('❌ Failed to submit service request');
    }

    // Test 3: Submit quotation request
    console.log('\n3. Testing quotation request submission...');
    const quotationRequest = {
      ...testServiceRequest,
      request_type: "Quotation",
      message: "I need a quote for deep cleaning of my entire house"
    };
    
    const quotationResponse = await axios.post(`${BASE_URL}/submit-service-requests`, quotationRequest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (quotationResponse.data.success) {
      console.log('✅ Quotation request submitted successfully');
      console.log(`   - Request type: ${quotationResponse.data.content.serviceRequest.request_type}`);
      console.log(`   - Message: ${quotationResponse.data.content.serviceRequest.message}`);
    } else {
      console.log('❌ Failed to submit quotation request');
    }

    // Test 4: Submit scheduled request
    console.log('\n4. Testing scheduled request submission...');
    const scheduledRequest = {
      ...testServiceRequest,
      request_type: "Scheduled",
      requested_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      message: "Please schedule for weekend cleaning"
    };
    
    const scheduledResponse = await axios.post(`${BASE_URL}/submit-service-requests`, scheduledRequest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (scheduledResponse.data.success) {
      console.log('✅ Scheduled request submitted successfully');
      console.log(`   - Request type: ${scheduledResponse.data.content.serviceRequest.request_type}`);
      console.log(`   - Requested date: ${scheduledResponse.data.content.serviceRequest.requested_date}`);
    } else {
      console.log('❌ Failed to submit scheduled request');
    }

    // Test 5: Test validation - missing required fields
    console.log('\n5. Testing validation - missing required fields...');
    try {
      await axios.post(`${BASE_URL}/submit-service-requests`, {
        user_name: "John Doe"
        // Missing other required fields
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Should have failed with missing required fields');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Missing required fields properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 6: Test validation - invalid email
    console.log('\n6. Testing validation - invalid email...');
    try {
      await axios.post(`${BASE_URL}/submit-service-requests`, {
        ...testServiceRequest,
        user_email: "invalid-email"
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Should have failed with invalid email');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid email properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 7: Test validation - past date
    console.log('\n7. Testing validation - past date...');
    try {
      await axios.post(`${BASE_URL}/submit-service-requests`, {
        ...testServiceRequest,
        requested_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Should have failed with past date');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Past date properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 8: Test invalid service ID
    console.log('\n8. Testing validation - invalid service ID...');
    try {
      await axios.post(`${BASE_URL}/submit-service-requests`, {
        ...testServiceRequest,
        service_id: "invalid-service-id"
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Should have failed with invalid service ID');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid service ID properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    console.log('\n🎉 All service endpoint tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Make sure to set a valid JWT token in TEST_TOKEN');
    }
  }
}

// Usage examples
function showUsageExamples() {
  console.log('\n📋 Usage Examples:\n');
  
  console.log('1. Get service by ID:');
  console.log('GET /api/services/64a1b2c3d4e5f6789abcdef1\n');
  
  console.log('2. Submit service request:');
  console.log('POST /api/submit-service-requests');
  console.log(JSON.stringify(testServiceRequest, null, 2));
  console.log();
  
  console.log('3. Using axios:');
  console.log(`
// Get service
const service = await axios.get('/api/services/64a1b2c3d4e5f6789abcdef1', {
  headers: { 'Authorization': \`Bearer \${token}\` }
});

// Submit request
const request = await axios.post('/api/submit-service-requests', {
  user_name: "John Doe",
  user_phone: "+1234567890",
  user_email: "john@example.com",
  address: "123 Main St, City, State 12345",
  service_id: "64a1b2c3d4e5f6789abcdef1",
  service_name: "AC Cleaning Service",
  category_id: "64a1b2c3d4e5f6789abcdef0",
  category_name: "Home Cleaning",
  request_type: "OnTime",
  requested_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  message: "Please clean the AC unit"
}, {
  headers: { 'Content-Type': 'application/json' }
});
  `);
  
  console.log('4. Frontend integration:');
  console.log(`
// React component example
const ServiceDetails = ({ serviceId }) => {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      setLoading(true);
      try {
        const response = await fetch(\`/api/services/\${serviceId}\`, {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        const data = await response.json();
        setService(data.content.service);
      } catch (error) {
        console.error('Error fetching service:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchService();
  }, [serviceId]);

  const submitRequest = async (requestData) => {
    try {
      const response = await fetch('/api/submit-service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!service) return <div>Service not found</div>;

  return (
    <div>
      <h1>{service.name}</h1>
      <p>{service.description}</p>
      <p>Price: ${service.basePrice}</p>
      <p>Category: {service.category_id.name}</p>
      {/* Request form here */}
    </div>
  );
};
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testServiceEndpoints();
  showUsageExamples();
}

module.exports = { testServiceEndpoints, showUsageExamples };

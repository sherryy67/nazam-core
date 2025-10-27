/**
 * Quick test for submit service requests endpoint
 */

const axios = require('axios');

async function testEndpoint() {
  console.log('🧪 Testing /api/submit-service-requests endpoint...\n');

  try {
    const testData = {
      user_name: 'Test User',
      user_phone: '+971501234567',
      user_email: 'test@example.com',
      address: '123 Test Street, Dubai, UAE',
      service_id: '64a1b2c3d4e5f6789abcdef1',
      service_name: 'Test Service',
      category_id: '64a1b2c3d4e5f6789abcdef2',
      category_name: 'Test Category',
      request_type: 'OnTime',
      requested_date: new Date().toISOString(),
      message: 'This is a test request'
    };

    console.log('📤 Sending request to:', 'http://localhost:3001/api/submit-service-requests');
    console.log('📋 Request data:', JSON.stringify(testData, null, 2));

    const response = await axios.post('http://localhost:3001/api/submit-service-requests', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('\n❌ Error occurred:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else if (error.request) {
      console.log('No response received:', error.message);
    } else {
      console.log('Request setup error:', error.message);
    }
  }
}

testEndpoint();

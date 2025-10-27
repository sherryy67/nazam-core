/**
 * Test script for submit service requests endpoint
 * This script tests the POST /api/submit-service-requests endpoint
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';

async function testSubmitServiceRequest() {
  console.log('🚀 Testing Submit Service Request API...\n');

  try {
    // Test 1: Submit service request successfully
    console.log('1. Testing service request submission...');
    const serviceRequestData = {
      user_name: 'John Doe',
      user_phone: '+971501234567',
      user_email: 'john.doe@example.com',
      address: '123 Main Street, Dubai, UAE',
      service_id: '64a1b2c3d4e5f6789abcdef1', // Replace with actual service ID
      service_name: 'Emergency Plumbing',
      category_id: '64a1b2c3d4e5f6789abcdef2', // Replace with actual category ID
      category_name: 'Plumbing',
      request_type: 'OnTime',
      requested_date: new Date().toISOString(),
      message: 'Need urgent plumbing service for blocked drain'
    };

    const response = await axios.post(`${BASE_URL}/submit-service-requests`, serviceRequestData);
    
    if (response.data.success) {
      console.log('✅ Service request submitted successfully');
      console.log(`   - Request ID: ${response.data.content.serviceRequest._id}`);
      console.log(`   - User: ${response.data.content.serviceRequest.user_name}`);
      console.log(`   - Service: ${response.data.content.serviceRequest.service_name}`);
      console.log(`   - Status: ${response.data.content.serviceRequest.status}`);
    } else {
      console.log('❌ Failed to submit service request');
      console.log(`   - Error: ${response.data.description}`);
    }

    // Test 2: Test validation - missing required fields
    console.log('\n2. Testing validation - missing required fields...');
    try {
      const incompleteData = {
        user_name: 'John Doe',
        // Missing other required fields
      };

      await axios.post(`${BASE_URL}/submit-service-requests`, incompleteData);
      console.log('❌ Should have failed with missing required fields');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Missing required fields properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 3: Test validation - invalid request type
    console.log('\n3. Testing validation - invalid request type...');
    try {
      const invalidData = {
        ...serviceRequestData,
        request_type: 'InvalidType'
      };

      await axios.post(`${BASE_URL}/submit-service-requests`, invalidData);
      console.log('❌ Should have failed with invalid request type');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid request type properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    console.log('\n🎉 All submit service request tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Route not found - check if the endpoint is properly registered');
    }
  }
}

// Usage examples
function showUsageExamples() {
  console.log('\n📋 Usage Examples:\n');
  
  console.log('1. Submit service request:');
  console.log(`
const submitServiceRequest = async (requestData) => {
  try {
    const response = await axios.post('/api/submit-service-requests', requestData);
    return response.data;
  } catch (error) {
    console.error('Error submitting service request:', error.response?.data);
    throw error;
  }
};
  `);
  
  console.log('2. Frontend integration (React):');
  console.log(`
const ServiceRequestForm = () => {
  const [formData, setFormData] = useState({
    user_name: '',
    user_phone: '',
    user_email: '',
    address: '',
    service_id: '',
    service_name: '',
    category_id: '',
    category_name: '',
    request_type: 'OnTime',
    requested_date: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/submit-service-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Service request submitted:', data.content.serviceRequest);
        // Show success message
      } else {
        throw new Error(data.description);
      }
    } catch (error) {
      console.error('Error submitting request:', error.message);
      // Show error message
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        name="user_name" 
        value={formData.user_name}
        onChange={(e) => setFormData({...formData, user_name: e.target.value})}
        placeholder="Your Name"
        required
      />
      {/* Other form fields */}
      <button type="submit">Submit Request</button>
    </form>
  );
};
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSubmitServiceRequest();
  showUsageExamples();
}

module.exports = { testSubmitServiceRequest, showUsageExamples };

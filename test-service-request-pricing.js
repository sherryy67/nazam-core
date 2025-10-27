/**
 * Test script for service request pricing functionality
 * Tests the updated POST /api/submit-service-requests endpoint with unit-based pricing
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';

async function testServiceRequestPricing() {
  console.log('🚀 Testing Service Request Pricing API...\n');

  try {
    // Test 1: Service with per_unit pricing
    console.log('1. Testing per_unit pricing...');
    const perUnitRequest = {
      user_name: 'John Doe',
      user_phone: '+971501234567',
      user_email: 'john.doe@example.com',
      address: '123 Main Street, Dubai, UAE',
      service_id: '64a1b2c3d4e5f6789abcdef1', // Replace with actual service ID
      service_name: 'Cleaning Service',
      category_id: '64a1b2c3d4e5f6789abcdef2', // Replace with actual category ID
      category_name: 'Cleaning',
      request_type: 'OnTime',
      requested_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      number_of_units: 3, // 3 units
      message: 'Need cleaning service for 3 rooms'
    };

    console.log('📤 Request data:', JSON.stringify(perUnitRequest, null, 2));

    const response1 = await axios.post(`${BASE_URL}/submit-service-requests`, perUnitRequest);
    
    if (response1.data.success) {
      console.log('✅ Per unit request submitted successfully');
      console.log(`   - Request ID: ${response1.data.content.serviceRequest._id}`);
      console.log(`   - Unit Type: ${response1.data.content.serviceRequest.unit_type}`);
      console.log(`   - Unit Price: ${response1.data.content.serviceRequest.unit_price}`);
      console.log(`   - Number of Units: ${response1.data.content.serviceRequest.number_of_units}`);
      console.log(`   - Total Price: ${response1.data.content.serviceRequest.total_price}`);
    } else {
      console.log('❌ Failed to submit per unit request');
      console.log(`   - Error: ${response1.data.description}`);
    }

    // Test 2: Service with per_hour pricing
    console.log('\n2. Testing per_hour pricing...');
    const perHourRequest = {
      user_name: 'Jane Smith',
      user_phone: '+971501234568',
      user_email: 'jane.smith@example.com',
      address: '456 Oak Avenue, Dubai, UAE',
      service_id: '64a1b2c3d4e5f6789abcdef3', // Replace with actual service ID
      service_name: 'Plumbing Service',
      category_id: '64a1b2c3d4e5f6789abcdef4', // Replace with actual category ID
      category_name: 'Plumbing',
      request_type: 'Scheduled',
      requested_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
      number_of_units: 2, // 2 hours
      message: 'Need plumbing service for 2 hours'
    };

    console.log('📤 Request data:', JSON.stringify(perHourRequest, null, 2));

    const response2 = await axios.post(`${BASE_URL}/submit-service-requests`, perHourRequest);
    
    if (response2.data.success) {
      console.log('✅ Per hour request submitted successfully');
      console.log(`   - Request ID: ${response2.data.content.serviceRequest._id}`);
      console.log(`   - Unit Type: ${response2.data.content.serviceRequest.unit_type}`);
      console.log(`   - Unit Price: ${response2.data.content.serviceRequest.unit_price}`);
      console.log(`   - Number of Units: ${response2.data.content.serviceRequest.number_of_units}`);
      console.log(`   - Total Price: ${response2.data.content.serviceRequest.total_price}`);
    } else {
      console.log('❌ Failed to submit per hour request');
      console.log(`   - Error: ${response2.data.description}`);
    }

    // Test 3: Validation - missing number_of_units
    console.log('\n3. Testing validation - missing number_of_units...');
    try {
      const incompleteData = {
        user_name: 'Test User',
        user_phone: '+971501234567',
        user_email: 'test@example.com',
        address: 'Test Address',
        service_id: '64a1b2c3d4e5f6789abcdef1',
        service_name: 'Test Service',
        category_id: '64a1b2c3d4e5f6789abcdef2',
        category_name: 'Test Category',
        request_type: 'OnTime',
        requested_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        // Missing number_of_units
        message: 'Test message'
      };

      await axios.post(`${BASE_URL}/submit-service-requests`, incompleteData);
      console.log('❌ Should have failed with missing number_of_units');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Missing number_of_units properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 4: Validation - invalid number_of_units
    console.log('\n4. Testing validation - invalid number_of_units...');
    try {
      const invalidData = {
        user_name: 'Test User',
        user_phone: '+971501234567',
        user_email: 'test@example.com',
        address: 'Test Address',
        service_id: '64a1b2c3d4e5f6789abcdef1',
        service_name: 'Test Service',
        category_id: '64a1b2c3d4e5f6789abcdef2',
        category_name: 'Test Category',
        request_type: 'OnTime',
        requested_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        number_of_units: 0, // Invalid: must be positive
        message: 'Test message'
      };

      await axios.post(`${BASE_URL}/submit-service-requests`, invalidData);
      console.log('❌ Should have failed with invalid number_of_units');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid number_of_units properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    console.log('\n🎉 All pricing tests completed!');

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
  
  console.log('1. Per Unit Service Request:');
  console.log(`
const submitPerUnitRequest = async (requestData) => {
  try {
    const response = await axios.post('/api/submit-service-requests', {
      ...requestData,
      number_of_units: 3 // 3 units
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting request:', error.response?.data);
    throw error;
  }
};
  `);
  
  console.log('2. Per Hour Service Request:');
  console.log(`
const submitPerHourRequest = async (requestData) => {
  try {
    const response = await axios.post('/api/submit-service-requests', {
      ...requestData,
      number_of_units: 2 // 2 hours
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting request:', error.response?.data);
    throw error;
  }
};
  `);
  
  console.log('3. Frontend Integration (React):');
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
    number_of_units: 1,
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
        const request = data.content.serviceRequest;
        console.log('Service request submitted:', request);
        console.log('Pricing details:', {
          unitType: request.unit_type,
          unitPrice: request.unit_price,
          numberOfUnits: request.number_of_units,
          totalPrice: request.total_price
        });
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
      <input 
        type="number" 
        name="number_of_units" 
        value={formData.number_of_units}
        onChange={(e) => setFormData({...formData, number_of_units: parseInt(e.target.value)})}
        placeholder="Number of Units/Hours"
        min="1"
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
  testServiceRequestPricing();
  showUsageExamples();
}

module.exports = { testServiceRequestPricing, showUsageExamples };

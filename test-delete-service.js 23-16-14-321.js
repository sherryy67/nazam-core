/**
 * Test script for delete service endpoint
 * This script tests the DELETE /api/services/:id endpoint
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_ADMIN_TOKEN = 'your_admin_jwt_token_here'; // Replace with actual admin token

async function testDeleteService() {
  console.log('🚀 Testing Delete Service API...\n');

  try {
    // Test 1: Delete service successfully
    console.log('1. Testing delete service (successful case)...');
    const serviceId = '64a1b2c3d4e5f6789abcdef1'; // Replace with actual service ID
    const deleteResponse = await axios.delete(`${BASE_URL}/services/${serviceId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
      }
    });
    
    if (deleteResponse.data.success) {
      console.log('✅ Service deleted successfully');
      console.log(`   - Service ID: ${deleteResponse.data.content.service._id}`);
      console.log(`   - Service name: ${deleteResponse.data.content.service.name}`);
      console.log(`   - Is active: ${deleteResponse.data.content.service.isActive}`);
    } else {
      console.log('❌ Failed to delete service');
    }

    // Test 2: Try to delete non-existent service
    console.log('\n2. Testing delete non-existent service...');
    try {
      await axios.delete(`${BASE_URL}/services/64a1b2c3d4e5f6789abcdef9`, {
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
        }
      });
      console.log('❌ Should have failed with non-existent service');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Non-existent service properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 3: Try to delete service without admin token
    console.log('\n3. Testing delete service without admin token...');
    try {
      await axios.delete(`${BASE_URL}/services/${serviceId}`, {
        headers: {
          'Authorization': `Bearer invalid_token`
        }
      });
      console.log('❌ Should have failed without valid admin token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Unauthorized access properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else if (error.response?.status === 403) {
        console.log('✅ Forbidden access properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 4: Try to delete service with regular user token (non-admin)
    console.log('\n4. Testing delete service with regular user token...');
    try {
      const regularUserToken = 'your_regular_user_token_here'; // Replace with actual user token
      await axios.delete(`${BASE_URL}/services/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${regularUserToken}`
        }
      });
      console.log('❌ Should have failed with regular user token');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Regular user access properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 5: Try to delete service that is in use
    console.log('\n5. Testing delete service that is in use...');
    const serviceInUseId = '64a1b2c3d4e5f6789abcdef2'; // Replace with service ID that has requests
    try {
      await axios.delete(`${BASE_URL}/services/${serviceInUseId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
        }
      });
      console.log('❌ Should have failed - service is in use');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Service in use properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
        console.log(`   - Exception: ${error.response.data.exception}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 6: Verify service is soft deleted (not actually removed)
    console.log('\n6. Testing that service is soft deleted...');
    try {
      const getServiceResponse = await axios.get(`${BASE_URL}/services/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
        }
      });
      console.log('❌ Service should not be accessible after deletion');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Service properly hidden after soft deletion');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    console.log('\n🎉 All delete service tests completed!');

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
  
  console.log('1. Delete service:');
  console.log('DELETE /api/services/64a1b2c3d4e5f6789abcdef1\n');
  
  console.log('2. Using axios:');
  console.log(`
const deleteService = async (serviceId) => {
  try {
    const response = await axios.delete(\`/api/services/\${serviceId}\`, {
      headers: { 'Authorization': \`Bearer \${adminToken}\` }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting service:', error.response?.data);
    throw error;
  }
};
  `);
  
  console.log('3. Using fetch:');
  console.log(`
const deleteService = async (serviceId) => {
  try {
    const response = await fetch(\`/api/services/\${serviceId}\`, {
      method: 'DELETE',
      headers: { 'Authorization': \`Bearer \${adminToken}\` }
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
};
  `);
  
  console.log('4. Frontend integration:');
  console.log(`
// React component example
const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  const deleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(\`/api/services/\${serviceId}\`, {
        method: 'DELETE',
        headers: { 'Authorization': \`Bearer \${adminToken}\` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.description);
      }
      
      const data = await response.json();
      console.log('Service deleted:', data);
      
      // Refresh services list
      await fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error.message);
      alert(\`Error: \${error.message}\`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {services.map(service => (
        <div key={service._id}>
          <h3>{service.name}</h3>
          <p>{service.description}</p>
          <button 
            onClick={() => deleteService(service._id)}
            disabled={loading}
          >
            Delete Service
          </button>
        </div>
      ))}
    </div>
  );
};
  `);
  
  console.log('5. Error handling:');
  console.log(`
// Handle different error scenarios
const handleDeleteService = async (serviceId) => {
  try {
    await deleteService(serviceId);
    console.log('Service deleted successfully');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('Cannot delete service - it is in use');
    } else if (error.response?.status === 403) {
      console.log('Access denied - admin privileges required');
    } else if (error.response?.status === 404) {
      console.log('Service not found');
    } else {
      console.log('Unexpected error:', error.message);
    }
  }
};
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDeleteService();
  showUsageExamples();
}

module.exports = { testDeleteService, showUsageExamples };

/**
 * Test script for Get All Active Services API
 * Tests the GET /api/services/active endpoint
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';

async function testGetAllActiveServices() {
  console.log('🚀 Testing Get All Active Services API...\n');

  try {
    // Test 1: Get all active services
    console.log('1. Testing get all active services...');
    
    const response = await axios.get(`${BASE_URL}/services/active`);
    
    if (response.data.success) {
      console.log('✅ Active services retrieved successfully');
      console.log(`   - Total services: ${response.data.content.total}`);
      console.log(`   - Services returned: ${response.data.content.services.length}`);
      
      if (response.data.content.services.length > 0) {
        const firstService = response.data.content.services[0];
        console.log('\n📋 Sample service data:');
        console.log(`   - ID: ${firstService._id}`);
        console.log(`   - Name: ${firstService.name}`);
        console.log(`   - Description: ${firstService.description}`);
        console.log(`   - Base Price: ${firstService.basePrice}`);
        console.log(`   - Unit Type: ${firstService.unitType}`);
        console.log(`   - Category: ${firstService.category_id?.name || 'N/A'}`);
        console.log(`   - Job Service Type: ${firstService.job_service_type}`);
        console.log(`   - Availability: ${firstService.availability?.join(', ') || 'N/A'}`);
        console.log(`   - Is Active: ${firstService.isActive}`);
        console.log(`   - Created At: ${firstService.createdAt}`);
      } else {
        console.log('   - No active services found');
      }
    } else {
      console.log('❌ Failed to retrieve active services');
      console.log(`   - Error: ${response.data.description}`);
    }

    // Test 2: Verify all returned services are active
    console.log('\n2. Verifying all services are active...');
    if (response.data.content.services.length > 0) {
      const allActive = response.data.content.services.every(service => service.isActive === true);
      if (allActive) {
        console.log('✅ All returned services are active');
      } else {
        console.log('❌ Some services are not active');
        const inactiveServices = response.data.content.services.filter(service => !service.isActive);
        console.log(`   - Inactive services: ${inactiveServices.length}`);
      }
    } else {
      console.log('ℹ️  No services to verify');
    }

    // Test 3: Check response structure
    console.log('\n3. Verifying response structure...');
    const requiredFields = ['success', 'exception', 'description', 'content'];
    const contentFields = ['services', 'total'];
    
    const hasRequiredFields = requiredFields.every(field => response.data.hasOwnProperty(field));
    const hasContentFields = contentFields.every(field => response.data.content.hasOwnProperty(field));
    
    if (hasRequiredFields && hasContentFields) {
      console.log('✅ Response structure is correct');
      console.log(`   - Success: ${response.data.success}`);
      console.log(`   - Exception: ${response.data.exception}`);
      console.log(`   - Description: ${response.data.description}`);
      console.log(`   - Services count: ${response.data.content.services.length}`);
      console.log(`   - Total: ${response.data.content.total}`);
    } else {
      console.log('❌ Response structure is incorrect');
      console.log(`   - Required fields present: ${hasRequiredFields}`);
      console.log(`   - Content fields present: ${hasContentFields}`);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Route not found - check if the endpoint is properly registered');
    } else if (error.response?.status === 401) {
      console.log('\n💡 Unauthorized - check if authentication is required');
    }
  }
}

// Usage examples
function showUsageExamples() {
  console.log('\n📋 Usage Examples:\n');
  
  console.log('1. Basic fetch request:');
  console.log(`
const getAllActiveServices = async () => {
  try {
    const response = await axios.get('/api/services/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching services:', error.response?.data);
    throw error;
  }
};
  `);
  
  console.log('2. Frontend integration (React):');
  console.log(`
const ServicesList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services/active');
        const data = await response.json();
        
        if (data.success) {
          setServices(data.content.services);
        } else {
          throw new Error(data.description);
        }
      } catch (error) {
        console.error('Error fetching services:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (loading) return <div>Loading services...</div>;

  return (
    <div>
      <h2>Available Services ({services.length})</h2>
      {services.map(service => (
        <div key={service._id} className="service-card">
          <h3>{service.name}</h3>
          <p>{service.description}</p>
          <p>Price: ${service.basePrice} per {service.unitType}</p>
          <p>Category: {service.category_id?.name}</p>
          <p>Availability: {service.availability?.join(', ')}</p>
        </div>
      ))}
    </div>
  );
};
  `);
  
  console.log('3. Service filtering by category:');
  console.log(`
const getServicesByCategory = async (categoryId) => {
  try {
    const response = await axios.get('/api/services/active');
    const allServices = response.data.content.services;
    
    // Filter by category on frontend
    const filteredServices = allServices.filter(
      service => service.category_id._id === categoryId
    );
    
    return filteredServices;
  } catch (error) {
    console.error('Error filtering services:', error.response?.data);
    throw error;
  }
};
  `);
  
  console.log('4. Service search functionality:');
  console.log(`
const searchServices = async (searchTerm) => {
  try {
    const response = await axios.get('/api/services/active');
    const allServices = response.data.content.services;
    
    // Search in name and description
    const filteredServices = allServices.filter(service => 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return filteredServices;
  } catch (error) {
    console.error('Error searching services:', error.response?.data);
    throw error;
  }
};
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testGetAllActiveServices();
  showUsageExamples();
}

module.exports = { testGetAllActiveServices, showUsageExamples };

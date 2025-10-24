/**
 * Test script for category filtering in GET /api/services
 * This script tests the new category query parameter functionality
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_TOKEN = 'your_jwt_token_here'; // Replace with actual token

async function testCategoryFilter() {
  console.log('🚀 Testing Category Filter API...\n');

  try {
    // Test 1: Get all services (no filter)
    console.log('1. Testing GET all services (no filter)...');
    const allServicesResponse = await axios.get(`${BASE_URL}/services`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    if (allServicesResponse.data.success) {
      console.log('✅ All services retrieved successfully');
      console.log(`   - Total services: ${allServicesResponse.data.content.total}`);
      console.log(`   - Services returned: ${allServicesResponse.data.content.services.length}`);
    } else {
      console.log('❌ Failed to retrieve all services');
      return;
    }

    // Test 2: Get services by category
    console.log('\n2. Testing GET services by category...');
    const categoryId = '64a1b2c3d4e5f6789abcdef0'; // Replace with actual category ID
    const categoryServicesResponse = await axios.get(`${BASE_URL}/services?category=${categoryId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    if (categoryServicesResponse.data.success) {
      console.log('✅ Category-filtered services retrieved successfully');
      console.log(`   - Services in category: ${categoryServicesResponse.data.content.total}`);
      console.log(`   - Services returned: ${categoryServicesResponse.data.content.services.length}`);
      
      // Verify all services belong to the specified category
      const allInCategory = categoryServicesResponse.data.content.services.every(
        service => service.category_id._id === categoryId
      );
      console.log(`   - All services in correct category: ${allInCategory ? '✅' : '❌'}`);
    } else {
      console.log('❌ Failed to retrieve category-filtered services');
    }

    // Test 3: Test with invalid category ID
    console.log('\n3. Testing with invalid category ID...');
    try {
      await axios.get(`${BASE_URL}/services?category=invalid_id`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      console.log('❌ Should have failed with invalid category ID');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid category ID properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 4: Test with non-existent category ID
    console.log('\n4. Testing with non-existent category ID...');
    try {
      await axios.get(`${BASE_URL}/services?category=64a1b2c3d4e5f6789abcdef9`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      console.log('❌ Should have failed with non-existent category ID');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Non-existent category ID properly rejected');
        console.log(`   - Error: ${error.response.data.description}`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 5: Test URL encoding
    console.log('\n5. Testing URL encoding...');
    const encodedCategoryId = encodeURIComponent(categoryId);
    const encodedResponse = await axios.get(`${BASE_URL}/services?category=${encodedCategoryId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    if (encodedResponse.data.success) {
      console.log('✅ URL encoding works correctly');
      console.log(`   - Services returned: ${encodedResponse.data.content.services.length}`);
    } else {
      console.log('❌ URL encoding failed');
    }

    console.log('\n🎉 All category filter tests completed!');

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
  
  console.log('1. Get all services:');
  console.log('GET /api/services\n');
  
  console.log('2. Get services by category:');
  console.log('GET /api/services?category=64a1b2c3d4e5f6789abcdef0\n');
  
  console.log('3. Using axios:');
  console.log(`
const response = await axios.get('/api/services?category=64a1b2c3d4e5f6789abcdef0', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});
  `);
  
  console.log('4. Using fetch:');
  console.log(`
const response = await fetch('/api/services?category=64a1b2c3d4e5f6789abcdef0', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});
const data = await response.json();
  `);
  
  console.log('5. Frontend integration:');
  console.log(`
// React component example
const [services, setServices] = useState([]);
const [selectedCategory, setSelectedCategory] = useState('');

useEffect(() => {
  const fetchServices = async () => {
    const url = selectedCategory 
      ? \`/api/services?category=\${selectedCategory}\`
      : '/api/services';
    
    const response = await fetch(url, {
      headers: { 'Authorization': \`Bearer \${token}\` }
    });
    const data = await response.json();
    setServices(data.content.services);
  };
  
  fetchServices();
}, [selectedCategory]);
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCategoryFilter();
  showUsageExamples();
}

module.exports = { testCategoryFilter, showUsageExamples };
